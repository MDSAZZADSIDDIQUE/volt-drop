import { isUuidV7 } from '@voltdrop/domain';
import { describe, expect, it } from 'vitest';
import {
  correlationIdFrom,
  currentContext,
  currentCorrelationId,
  runWithContext,
} from './request-context.js';

describe('correlationIdFrom()', () => {
  it('reuses a well-formed incoming request id', () => {
    expect(correlationIdFrom('req-12345678')).toBe('req-12345678');
    expect(correlationIdFrom(['trace:abcdefgh', 'second'])).toBe('trace:abcdefgh');
  });

  it.each([undefined, 'short', 'has spaces in it', 'x'.repeat(129), 'ada@example.com'])(
    'starts a new UUIDv7 id instead of %j',
    (header) => {
      expect(isUuidV7(correlationIdFrom(header))).toBe(true);
    },
  );
});

describe('request context', () => {
  it('is available inside the call chain, across awaits, and nowhere else', async () => {
    const seen = await runWithContext({ correlationId: 'req-12345678' }, async () => {
      await new Promise((resolve) => setTimeout(resolve, 1));
      return currentCorrelationId();
    });
    expect(seen).toBe('req-12345678');
    expect(currentContext()).toBeUndefined();
    expect(currentCorrelationId()).toBeUndefined();
  });

  it('keeps concurrent requests apart', async () => {
    const ids = await Promise.all(
      ['req-aaaaaaaa', 'req-bbbbbbbb'].map((correlationId) =>
        runWithContext({ correlationId }, async () => {
          await new Promise((resolve) => setTimeout(resolve, correlationId.endsWith('a') ? 5 : 1));
          return currentCorrelationId();
        }),
      ),
    );
    expect(ids).toEqual(['req-aaaaaaaa', 'req-bbbbbbbb']);
  });
});
