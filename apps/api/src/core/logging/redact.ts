/**
 * Removes personal data and secrets before anything is logged (spec §6: redact names, emails, phone
 * numbers, addresses, tokens and free-text fields). Values under sensitive keys are replaced whole;
 * every other string is scanned for email addresses, UK phone numbers and UK postcodes.
 * Over-redaction is the safe way to fail.
 */
export const REDACTED = '[redacted]';

const MAX_DEPTH = 8;
const MAX_SCANNED_LENGTH = 10_000;

// Compared after lower-casing and dropping everything but letters and digits, so `first_name`,
// `firstName` and `First-Name` all match `firstname`.
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  // People's names
  'firstname',
  'lastname',
  'fullname',
  'givenname',
  'familyname',
  'middlename',
  'displayname',
  'customername',
  'contactname',
  'recipientname',
  'buyername',
  'staffname',
  // Contact details
  'email',
  'emailaddress',
  'phone',
  'phonenumber',
  'mobile',
  'mobilenumber',
  'telephone',
  // Addresses and locations
  'address',
  'addressline1',
  'addressline2',
  'addressline3',
  'line1',
  'line2',
  'line3',
  'street',
  'postcode',
  'postalcode',
  'latitude',
  'longitude',
  'lat',
  'lng',
  'lon',
  'coordinates',
  // Free text
  'notes',
  'note',
  'comment',
  'comments',
  'description',
  'reason',
  'instructions',
  'deliveryinstructions',
  'freetext',
  'body',
  // Secrets and credentials
  'password',
  'passcode',
  'pin',
  'otp',
  'secret',
  'clientsecret',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'sessiontoken',
  'apikey',
  'xapikey',
  'authorization',
  'cookie',
  'setcookie',
  'signature',
  'stripesignature',
  // Identity and network
  'dateofbirth',
  'dob',
  'nationalinsurancenumber',
  'nino',
  'passportnumber',
  'taxreference',
  'utr',
  'ip',
  'ipaddress',
  'remoteaddress',
  'xforwardedfor',
  'xrealip',
]);

const EMAIL = /[\w.%+-]+@[\w-]+(?:\.[\w-]+)+/g;
// +44 or a leading 0, then 9 or 10 more digits, optionally separated by single spaces.
const UK_PHONE = /(?:\+44\s?|\b0)\d(?:\s?\d){8,9}\b/g;
const UK_POSTCODE = /\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/gi;

function normaliseKey(key: string): string {
  return key.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/** Keys such as `id`, `orderId` or `correlationId` hold identifiers, which are safe to log as they are. */
function isIdentifierKey(key: string): boolean {
  return normaliseKey(key).endsWith('id');
}

export function redactString(value: string): string {
  const scanned =
    value.length > MAX_SCANNED_LENGTH ? `${value.slice(0, MAX_SCANNED_LENGTH)}…[truncated]` : value;
  return scanned
    .replace(EMAIL, '[email]')
    .replace(UK_PHONE, '[phone]')
    .replace(UK_POSTCODE, '[postcode]');
}

function walk(value: unknown, depth: number, seen: WeakSet<object>, key?: string): unknown {
  if (typeof value === 'string') {
    return key !== undefined && isIdentifierKey(key) ? value : redactString(value);
  }
  if (typeof value === 'bigint') {
    return value.toString();
  }
  if (typeof value === 'function' || typeof value === 'symbol') {
    return undefined;
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  if (ArrayBuffer.isView(value)) {
    return '[binary]';
  }
  if (seen.has(value)) {
    return '[circular]';
  }
  if (depth >= MAX_DEPTH) {
    return '[truncated]';
  }
  seen.add(value);

  if (Array.isArray(value)) {
    return value.map((item: unknown) => walk(item, depth + 1, seen));
  }

  const output: Record<string, unknown> = {};
  if (value instanceof Error) {
    output.type = value.name;
    output.message = redactString(value.message);
    if (value.stack !== undefined) {
      output.stack = redactString(value.stack);
    }
  }
  for (const [entryKey, entryValue] of Object.entries(value)) {
    output[entryKey] = SENSITIVE_KEYS.has(normaliseKey(entryKey))
      ? REDACTED
      : walk(entryValue, depth + 1, seen, entryKey);
  }
  return output;
}

/** Returns a copy of `value` that is safe to log. The input is never modified. */
export function redact(value: unknown): unknown {
  return walk(value, 0, new WeakSet());
}
