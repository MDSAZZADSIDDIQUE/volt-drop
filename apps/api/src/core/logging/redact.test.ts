import { describe, expect, it } from 'vitest';
import { REDACTED, redact, redactString } from './redact.js';

describe('redact()', () => {
  it('replaces values under sensitive keys at any depth, whatever the key style', () => {
    expect(
      redact({
        order: {
          customer: { first_name: 'Ada', Email: 'ada@example.com', phoneNumber: '07700 900123' },
          delivery: {
            addressLine1: '1 High Street',
            postcode: 'M1 1AE',
            deliveryInstructions: 'Ring twice',
          },
          status: 'accepted',
        },
      }),
    ).toEqual({
      order: {
        customer: { first_name: REDACTED, Email: REDACTED, phoneNumber: REDACTED },
        delivery: { addressLine1: REDACTED, postcode: REDACTED, deliveryInstructions: REDACTED },
        status: 'accepted',
      },
    });
  });

  it('redacts secrets and authentication headers', () => {
    expect(
      redact({
        headers: {
          authorization: 'Bearer abc',
          cookie: 'sid=1',
          'set-cookie': ['sid=2'],
          'x-api-key': 'key',
          'stripe-signature': 't=1,v1=abc',
          accept: 'application/json',
        },
      }),
    ).toEqual({
      headers: {
        authorization: REDACTED,
        cookie: REDACTED,
        'set-cookie': REDACTED,
        'x-api-key': REDACTED,
        'stripe-signature': REDACTED,
        accept: 'application/json',
      },
    });
  });

  it('leaves identifiers, references, amounts and statuses as they are', () => {
    const value = {
      orderId: '0192f3a1-7b2c-7d3e-8f40-123456789abc',
      correlationId: 'req-ab1c2de-07700900123',
      reference: 'VD-7K3Q9A',
      amountMinor: 1999,
      status: 'accepted',
      ok: true,
      missing: null,
    };
    expect(redact(value)).toEqual(value);
  });

  it('scans ordinary words that merely end in the letters of an identifier', () => {
    expect(
      redact({
        paid: 'card ending 1234, receipt to ada@example.com',
        valid: 'until M1 1AE',
        void: 'call 07700 900123',
        grid: 'M1 1AE',
      }),
    ).toEqual({
      paid: 'card ending 1234, receipt to [email]',
      valid: 'until [postcode]',
      void: 'call [phone]',
      grid: '[postcode]',
    });
  });

  it('keeps identifier values intact whatever the key style', () => {
    const value = {
      id: 'ab1c2de',
      order_id: 'ab1c2de',
      ORDER_ID: 'ab1c2de',
      orderId: 'ab1c2de',
      uuid: '0192f3a1-7b2c-7d3e-8f40-123456789abc',
    };
    expect(redact(value)).toEqual(value);
  });

  it('redacts a bare name, contact and recipient, but not the name of a thing', () => {
    expect(
      redact({
        name: 'Ada Lovelace',
        contact: 'Ada',
        recipient: 'Ada',
        storeName: 'Tech Hub Oldham Street',
        productName: 'Anker USB-C cable',
      }),
    ).toEqual({
      name: REDACTED,
      contact: REDACTED,
      recipient: REDACTED,
      storeName: 'Tech Hub Oldham Street',
      productName: 'Anker USB-C cable',
    });
  });

  it('handles arrays, dates, bigints, binary data and functions', () => {
    expect(
      redact({
        at: new Date('2026-09-11T10:00:00Z'),
        big: 10n,
        list: ['ada@example.com', 3],
        bytes: new Uint8Array([1, 2]),
        callback: () => 1,
      }),
    ).toEqual({
      at: '2026-09-11T10:00:00.000Z',
      big: '10',
      list: ['[email]', 3],
      bytes: '[binary]',
      callback: undefined,
    });
  });

  it('survives circular references and very deep nesting', () => {
    const circular: Record<string, unknown> = { label: 'loop' };
    circular.self = circular;
    expect(redact(circular)).toEqual({ label: 'loop', self: '[circular]' });

    let deep: unknown = 'bottom';
    for (let level = 0; level < 12; level += 1) {
      deep = { next: deep };
    }
    expect(JSON.stringify(redact(deep))).toContain('[truncated]');
  });

  it('keeps the useful parts of errors while masking personal data in them', () => {
    const error = Object.assign(new Error('duplicate key value (email)=(ada@example.com)'), {
      code: '23505',
    });
    expect(redact({ err: error })).toMatchObject({
      err: { type: 'Error', message: 'duplicate key value (email)=([email])', code: '23505' },
    });
  });

  it('never changes its input', () => {
    const input = { email: 'ada@example.com' };
    redact(input);
    expect(input).toEqual({ email: 'ada@example.com' });
  });
});

describe('redactString()', () => {
  it('masks contact details inside free text', () => {
    expect(
      redactString(
        'Call 07700 900123 or +44 7700 900456, email ada.l@example.co.uk, deliver to M1 1AE or SW1A 1AA',
      ),
    ).toBe('Call [phone] or [phone], email [email], deliver to [postcode] or [postcode]');
  });

  it('leaves ordinary text and identifiers alone', () => {
    expect(redactString('Order VD-7K3Q9A accepted in 45 s by store 0192f3a1-7b2c')).toBe(
      'Order VD-7K3Q9A accepted in 45 s by store 0192f3a1-7b2c',
    );
  });

  it('truncates very long strings before scanning them', () => {
    const result = redactString('x'.repeat(20_000));
    expect(result.endsWith('…[truncated]')).toBe(true);
    expect(result.length).toBeLessThan(10_100);
  });
});
