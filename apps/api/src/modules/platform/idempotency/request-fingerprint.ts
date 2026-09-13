import { createHash } from 'node:crypto';
import { PROBLEMS, ProblemException } from '../../../core/problems/problem.js';

const KEY_PATTERN = /^[\x21-\x7E]{1,255}$/;

/** The Idempotency-Key header: exactly one value of 1 to 255 visible ASCII characters (ADR-0014). */
export function parseIdempotencyKey(header: string | readonly string[] | undefined): string {
  if (typeof header !== 'string' || !KEY_PATTERN.test(header)) {
    throw new ProblemException(PROBLEMS.idempotencyKeyRequired);
  }
  return header;
}

function compareCodeUnits(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  return a < b ? -1 : 1;
}

/** JSON with object keys sorted at every level, so bodies that differ only in key order match. */
export function canonicalJson(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map((item: unknown) => canonicalJson(item)).join(',')}]`;
  }
  if (typeof value === 'object' && value !== null) {
    const members = Object.entries(value)
      .filter(([, member]) => member !== undefined)
      .sort(([a], [b]) => compareCodeUnits(a, b))
      .map(([name, member]) => `${JSON.stringify(name)}:${canonicalJson(member)}`);
    return `{${members.join(',')}}`;
  }
  // JSON.stringify returns undefined for undefined, functions and symbols.
  const json: unknown = JSON.stringify(value);
  return typeof json === 'string' ? json : 'null';
}

/** SHA-256 of the method, the path with its query, and the canonical body. */
export function requestFingerprint(method: string, url: string, body: unknown): string {
  return createHash('sha256')
    .update(`${method.toUpperCase()}\n${url}\n${canonicalJson(body)}`)
    .digest('hex');
}
