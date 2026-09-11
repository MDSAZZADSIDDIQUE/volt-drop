import { problemType, type ProblemDetails } from '@voltdrop/domain';

/** One field that failed validation. */
export interface FieldProblem {
  readonly path: string;
  readonly message: string;
}

export interface ProblemInit {
  /** Stable kebab-case code. It becomes the `type` URN, and clients branch on it, so it never changes. */
  readonly code: string;
  readonly status: number;
  /** Short, plain English, sentence case (spec §6, §9). */
  readonly title: string;
  /** What happened and how to fix it. Never internal details. */
  readonly detail?: string;
  readonly errors?: readonly FieldProblem[];
}

/** An error that becomes an RFC 9457 problem response (spec §6). Throw it from anywhere in a request. */
export class ProblemException extends Error {
  readonly problem: ProblemInit;

  constructor(problem: ProblemInit) {
    super(problem.detail ?? problem.title);
    this.name = 'ProblemException';
    this.problem = problem;
  }
}

/** The problem catalogue. Order matters: for a shared status, the first entry is the generic one. */
export const PROBLEMS = {
  badRequest: { code: 'bad-request', status: 400, title: 'The request is malformed' },
  validationFailed: { code: 'validation-failed', status: 400, title: 'Some fields need fixing' },
  unauthenticated: { code: 'unauthenticated', status: 401, title: 'Sign in to continue' },
  forbidden: { code: 'forbidden', status: 403, title: "You don't have permission to do that" },
  notFound: { code: 'not-found', status: 404, title: "We couldn't find that" },
  methodNotAllowed: {
    code: 'method-not-allowed',
    status: 405,
    title: "That action isn't allowed here",
  },
  conflict: { code: 'conflict', status: 409, title: 'That clashes with a change made elsewhere' },
  payloadTooLarge: { code: 'payload-too-large', status: 413, title: 'The request is too large' },
  unsupportedMediaType: {
    code: 'unsupported-media-type',
    status: 415,
    title: "That content type isn't supported",
  },
  unprocessable: { code: 'unprocessable', status: 422, title: "The request couldn't be processed" },
  tooManyRequests: {
    code: 'too-many-requests',
    status: 429,
    title: 'Too many requests. Try again shortly',
  },
  internalError: { code: 'internal-error', status: 500, title: 'Something went wrong on our side' },
  serviceUnavailable: {
    code: 'service-unavailable',
    status: 503,
    title: 'The service is temporarily unavailable. Try again shortly',
  },
} as const satisfies Record<string, ProblemInit>;

const CATALOGUE: readonly ProblemInit[] = Object.values(PROBLEMS);

/** The catalogue entry for a bare HTTP status, used for framework errors that carry no code. */
export function problemForStatus(status: number): ProblemInit {
  const known = CATALOGUE.find((problem) => problem.status === status);
  if (known !== undefined) {
    return known;
  }
  if (status >= 500) {
    return PROBLEMS.internalError;
  }
  return { code: 'http-error', status, title: "The request couldn't be completed" };
}

export function validationProblem(errors: readonly FieldProblem[]): ProblemException {
  return new ProblemException({ ...PROBLEMS.validationFailed, errors });
}

/** The response body. `instance` is the request's correlation id, which support can search for. */
export function toProblemBody(problem: ProblemInit, instance: string | undefined): ProblemDetails {
  const body: ProblemDetails = {
    type: problemType(problem.code),
    title: problem.title,
    status: problem.status,
  };
  if (problem.detail !== undefined) {
    body.detail = problem.detail;
  }
  if (instance !== undefined) {
    body.instance = instance;
  }
  if (problem.errors !== undefined && problem.errors.length > 0) {
    body.errors = [...problem.errors];
  }
  return body;
}
