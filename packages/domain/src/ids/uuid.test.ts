import { describe, expect, it } from 'vitest';
import { isUuidV7, newId, parseId, UuidV7Schema } from './uuid.js';

describe('UUIDv7 ids', () => {
  it('generates valid, time-ordered UUIDv7 values', () => {
    const ids = Array.from({ length: 1000 }, () => newId<'order'>());
    expect(ids.every((id) => isUuidV7(id))).toBe(true);
    expect([...ids].sort()).toEqual(ids);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('rejects other versions and non-strings', () => {
    expect(isUuidV7('0b8c4f2e-8a3d-4c1e-9f6a-2d7b5e1c3a90')).toBe(false); // v4
    expect(isUuidV7('not-a-uuid')).toBe(false);
    expect(isUuidV7(42)).toBe(false);
  });

  it('parses a UUIDv7 and refuses anything else', () => {
    const id = newId<'store'>();
    expect(parseId<'store'>(id)).toBe(id);
    expect(() => parseId('0b8c4f2e-8a3d-4c1e-9f6a-2d7b5e1c3a90')).toThrow(TypeError);
  });

  it('validates with the zod schema', () => {
    expect(UuidV7Schema.safeParse(newId()).success).toBe(true);
    expect(UuidV7Schema.safeParse('nope').success).toBe(false);
  });
});
