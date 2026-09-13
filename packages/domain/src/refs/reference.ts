/**
 * Human-friendly references for support, such as `VD-7K3Q9A` for orders and `RT-4MX2PB` for
 * returns (spec §6). Codes use Crockford base32 without I, L, O and U, so they read clearly over
 * the phone: 32⁶ gives about a billion codes per prefix. Uniqueness is enforced by a database
 * unique index with a retry, not here.
 */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
const CODE_LENGTH = 6;

export const REFERENCE_PREFIXES = { order: 'VD', return: 'RT' } as const;
export type ReferencePrefix = (typeof REFERENCE_PREFIXES)[keyof typeof REFERENCE_PREFIXES];

/** Returns `length` cryptographically random bytes. Injectable so tests can be deterministic. */
export type RandomBytes = (length: number) => Uint8Array;

const cryptoRandomBytes: RandomBytes = (length) => crypto.getRandomValues(new Uint8Array(length));

const REFERENCE_PATTERN = /^(VD|RT)-[0-9A-HJKMNP-TV-Z]{6}$/;

export function newReference(
  prefix: ReferencePrefix,
  randomBytes: RandomBytes = cryptoRandomBytes,
): string {
  const bytes = randomBytes(CODE_LENGTH);
  if (bytes.length !== CODE_LENGTH) {
    throw new RangeError(
      `Expected ${String(CODE_LENGTH)} random bytes, got ${String(bytes.length)}.`,
    );
  }
  // 256 is a multiple of 32, so taking each byte modulo 32 keeps every symbol equally likely.
  const code = Array.from(bytes, (byte) => ALPHABET.charAt(byte % 32)).join('');
  return `${prefix}-${code}`;
}

export function isReference(value: string): boolean {
  return REFERENCE_PATTERN.test(value);
}

/**
 * Turns what a customer or agent types into a canonical reference, or null. It accepts any case,
 * spaces or a missing hyphen, and reads O as 0 and I or L as 1, following Crockford's decoding rules.
 */
export function normaliseReference(input: string): string | null {
  const compact = input.trim().toUpperCase().replace(/[\s-]/g, '');
  const code = compact.slice(2).replace(/O/g, '0').replace(/[IL]/g, '1');
  const candidate = `${compact.slice(0, 2)}-${code}`;
  return REFERENCE_PATTERN.test(candidate) ? candidate : null;
}
