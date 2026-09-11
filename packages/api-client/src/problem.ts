import { ProblemDetailsSchema, type ProblemDetails } from '@voltdrop/domain';

const TYPE_PREFIX = 'urn:voltdrop:problem:';
const STANDARD_MEMBERS = new Set(['type', 'title', 'status', 'detail', 'instance', 'errors']);

/**
 * An error response from the VoltDrop API: RFC 9457 problem details (spec §6). Branch on `code`,
 * which never changes. Show `title` and `detail` to people; they are written for them.
 */
export class ApiProblem extends Error {
  readonly status: number;
  /** The stable code from the problem type, for example `validation-failed`. */
  readonly code: string;
  readonly problem: ProblemDetails;
  /** Members beyond the standard ones, such as readiness `checks`. */
  readonly extensions: Readonly<Record<string, unknown>>;

  constructor(
    status: number,
    problem: ProblemDetails,
    extensions: Readonly<Record<string, unknown>> = {},
  ) {
    super(problem.detail ?? problem.title);
    this.name = 'ApiProblem';
    this.status = status;
    this.problem = problem;
    this.code = problem.type.startsWith(TYPE_PREFIX)
      ? problem.type.slice(TYPE_PREFIX.length)
      : 'http-error';
    this.extensions = extensions;
  }

  /** Validation messages keyed by field path, ready for a form library. */
  get fieldErrors(): Readonly<Record<string, string>> {
    return Object.fromEntries(
      (this.problem.errors ?? []).map(({ path, message }) => [path, message]),
    );
  }
}

/**
 * Turns a failed response into an ApiProblem. A body that isn't problem details (a proxy's HTML
 * 502, for example) still becomes one, with the code `http-error`.
 */
export async function toApiProblem(response: Response): Promise<ApiProblem> {
  let body: unknown;
  try {
    body = await response.json();
  } catch {
    body = undefined;
  }
  const parsed = ProblemDetailsSchema.safeParse(body);
  if (parsed.success && typeof body === 'object' && body !== null) {
    const extensions = Object.fromEntries(
      Object.entries(body).filter(([member]) => !STANDARD_MEMBERS.has(member)),
    );
    return new ApiProblem(response.status, parsed.data, extensions);
  }
  return new ApiProblem(response.status, {
    type: 'about:blank',
    title: response.statusText === '' ? 'The request failed' : response.statusText,
    status: response.status,
  });
}
