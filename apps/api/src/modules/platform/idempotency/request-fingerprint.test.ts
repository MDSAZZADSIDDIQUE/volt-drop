import { describe, expect, it } from 'vitest';
import { ProblemException } from '../../../core/problems/problem.js';
import { canonicalJson, parseIdempotencyKey, requestFingerprint } from './request-fingerprint.js';

describe('parseIdempotencyKey', () => {
  it.each(['0192f0c4-7a3e-7cc1-9a51-1f2e3d4c5b6a', 'a', '~'.repeat(255)])('accepts %s', (key) => {
    expect(parseIdempotencyKey(key)).toBe(key);
  });

  it.each([
    ['missing', undefined],
    ['empty', ''],
    ['too long', 'k'.repeat(256)],
    ['containing a space', 'my key'],
    ['non-ASCII', 'clé'],
    ['repeated', ['a', 'b']],
  ])('rejects a key that is %s', (_label, header) => {
    expect(() => parseIdempotencyKey(header)).toThrow(ProblemException);
    try {
      parseIdempotencyKey(header);
    } catch (error) {
      expect((error as ProblemException).problem.code).toBe('idempotency-key-required');
    }
  });
});

describe('canonicalJson', () => {
  it('sorts object keys at every level', () => {
    expect(canonicalJson({ b: 1, a: { d: [2, { f: 3, e: 4 }], c: null } })).toBe(
      '{"a":{"c":null,"d":[2,{"e":4,"f":3}]},"b":1}',
    );
  });

  it('drops undefined members and writes undefined as null elsewhere', () => {
    expect(canonicalJson({ a: undefined, b: 'x' })).toBe('{"b":"x"}');
    expect(canonicalJson([undefined])).toBe('[null]');
    expect(canonicalJson(undefined)).toBe('null');
  });

  it('writes scalars as JSON', () => {
    expect(canonicalJson('£5 "off"')).toBe('"£5 \\"off\\""');
    expect(canonicalJson(12.5)).toBe('12.5');
    expect(canonicalJson(true)).toBe('true');
  });
});

describe('requestFingerprint', () => {
  const body = { lines: [{ offerId: 'o1', quantity: 2 }], note: 'x' };

  it('matches for bodies that differ only in key order', () => {
    expect(requestFingerprint('post', '/v1/orders', body)).toBe(
      requestFingerprint('POST', '/v1/orders', {
        note: 'x',
        lines: [{ quantity: 2, offerId: 'o1' }],
      }),
    );
  });

  it('differs by method, path, query and body', () => {
    const base = requestFingerprint('POST', '/v1/orders', body);
    expect(requestFingerprint('PUT', '/v1/orders', body)).not.toBe(base);
    expect(requestFingerprint('POST', '/v1/orders/2', body)).not.toBe(base);
    expect(requestFingerprint('POST', '/v1/orders?dry=1', body)).not.toBe(base);
    expect(requestFingerprint('POST', '/v1/orders', { ...body, note: 'y' })).not.toBe(base);
  });
});
