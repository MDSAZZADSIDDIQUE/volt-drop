import { describe, expect, it } from 'vitest';
import { ProblemDetailsSchema, problemType } from './problem.js';

describe('problem details', () => {
  it('builds stable type URNs', () => {
    expect(problemType('validation-failed')).toBe('urn:voltdrop:problem:validation-failed');
  });

  it('accepts an RFC 9457 body with field errors', () => {
    const body = {
      type: problemType('validation-failed'),
      title: 'Some fields need fixing',
      status: 400,
      instance: 'req_123',
      errors: [{ path: 'quantity', message: 'Must be at least 1' }],
    };
    expect(ProblemDetailsSchema.parse(body)).toEqual(body);
  });

  it('rejects non-error statuses', () => {
    expect(ProblemDetailsSchema.safeParse({ type: 'x', title: 'x', status: 200 }).success).toBe(
      false,
    );
  });
});
