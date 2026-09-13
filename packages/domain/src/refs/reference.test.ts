import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { isReference, newReference, normaliseReference, REFERENCE_PREFIXES } from './reference.js';

describe('newReference()', () => {
  it('builds prefix-hyphen-six characters from the Crockford alphabet', () => {
    expect(
      newReference(REFERENCE_PREFIXES.order, () => new Uint8Array([7, 19, 3, 23, 9, 10])),
    ).toBe('VD-7K3Q9A');
    expect(
      newReference(REFERENCE_PREFIXES.return, () => new Uint8Array([4, 20, 29, 2, 23, 11])),
    ).toBe('RT-4MX2QB');
  });

  it('maps every byte value into the alphabet', () => {
    fc.assert(
      fc.property(fc.uint8Array({ minLength: 6, maxLength: 6 }), (bytes) => {
        expect(isReference(newReference('VD', () => bytes))).toBe(true);
      }),
    );
  });

  it('uses the crypto random source by default', () => {
    const references = Array.from({ length: 200 }, () => newReference('RT'));
    expect(
      references.every((reference) => isReference(reference) && reference.startsWith('RT-')),
    ).toBe(true);
    expect(new Set(references).size).toBeGreaterThan(190);
  });

  it('refuses a random source that returns the wrong number of bytes', () => {
    expect(() => newReference('VD', () => new Uint8Array(5))).toThrow(RangeError);
  });
});

describe('normaliseReference()', () => {
  it.each([
    ['VD-7K3Q9A', 'VD-7K3Q9A'],
    ['vd-7k3q9a', 'VD-7K3Q9A'],
    [' vd 7k3 q9a ', 'VD-7K3Q9A'],
    ['VD7K3Q9A', 'VD-7K3Q9A'],
    ['rt-4mx2pb', 'RT-4MX2PB'],
    ['RT-O1L2I3', 'RT-011213'],
  ])('reads %j as %s', (input, expected) => {
    expect(normaliseReference(input)).toBe(expected);
  });

  it.each(['', 'VD-7K3Q9', 'VD-7K3Q9AB', 'XX-7K3Q9A', 'VD-7K3Q9U'])('rejects %j', (input) => {
    expect(normaliseReference(input)).toBeNull();
  });
});
