import { ProblemDetailsSchema } from '@voltdrop/domain';
import { describe, expect, it } from 'vitest';
import {
  PROBLEMS,
  ProblemException,
  problemForStatus,
  toProblemBody,
  validationProblem,
} from './problem.js';

describe('problem catalogue', () => {
  it('uses unique, kebab-case codes', () => {
    const codes = Object.values(PROBLEMS).map((problem) => problem.code);
    expect(new Set(codes).size).toBe(codes.length);
    expect(codes.every((code) => /^[a-z]+(-[a-z]+)*$/.test(code))).toBe(true);
  });

  it('maps bare statuses to catalogue entries, preferring the generic one', () => {
    expect(problemForStatus(400)).toBe(PROBLEMS.badRequest);
    expect(problemForStatus(404)).toBe(PROBLEMS.notFound);
    expect(problemForStatus(503)).toBe(PROBLEMS.serviceUnavailable);
    expect(problemForStatus(502)).toBe(PROBLEMS.internalError);
    expect(problemForStatus(418)).toEqual({
      code: 'http-error',
      status: 418,
      title: "The request couldn't be completed",
    });
  });
});

describe('toProblemBody()', () => {
  it('builds a valid RFC 9457 body with the correlation id as instance', () => {
    const body = toProblemBody(PROBLEMS.notFound, 'req-12345678');
    expect(body).toEqual({
      type: 'urn:voltdrop:problem:not-found',
      title: "We couldn't find that",
      status: 404,
      instance: 'req-12345678',
    });
    expect(ProblemDetailsSchema.parse(body)).toEqual(body);
  });

  it('includes detail and field errors only when present', () => {
    const problem = validationProblem([
      { path: 'quantity', message: 'Too small: expected >=1' },
    ]).problem;
    expect(toProblemBody({ ...problem, detail: 'Check the quantity.' }, undefined)).toEqual({
      type: 'urn:voltdrop:problem:validation-failed',
      title: 'Some fields need fixing',
      status: 400,
      detail: 'Check the quantity.',
      errors: [{ path: 'quantity', message: 'Too small: expected >=1' }],
    });
    expect(
      toProblemBody({ ...PROBLEMS.validationFailed, errors: [] }, undefined),
    ).not.toHaveProperty('errors');
  });
});

describe('ProblemException', () => {
  it('carries its problem and a readable message', () => {
    const error = new ProblemException({ ...PROBLEMS.conflict, detail: 'The offer changed.' });
    expect(error).toBeInstanceOf(Error);
    expect(error.name).toBe('ProblemException');
    expect(error.message).toBe('The offer changed.');
    expect(error.problem.status).toBe(409);
  });
});
