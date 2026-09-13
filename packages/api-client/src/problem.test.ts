import { describe, expect, it } from 'vitest';
import { ApiProblem, toApiProblem } from './problem.js';

const problemResponse = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/problem+json' },
  });

describe('toApiProblem', () => {
  it('reads problem details, their code and their field errors', async () => {
    const problem = await toApiProblem(
      problemResponse(400, {
        type: 'urn:voltdrop:problem:validation-failed',
        title: 'Some fields need fixing',
        status: 400,
        instance: 'req-12345678',
        errors: [
          { path: 'name', message: 'Enter a name' },
          { path: 'lines.0.quantity', message: 'Must be at least 1' },
        ],
      }),
    );
    expect(problem).toBeInstanceOf(ApiProblem);
    expect(problem).toBeInstanceOf(Error);
    expect(problem.status).toBe(400);
    expect(problem.code).toBe('validation-failed');
    expect(problem.message).toBe('Some fields need fixing');
    expect(problem.problem.instance).toBe('req-12345678');
    expect(problem.fieldErrors).toEqual({
      name: 'Enter a name',
      'lines.0.quantity': 'Must be at least 1',
    });
    expect(problem.extensions).toEqual({});
  });

  it('keeps extension members and prefers the detail as the message', async () => {
    const problem = await toApiProblem(
      problemResponse(503, {
        type: 'urn:voltdrop:problem:service-unavailable',
        title: 'The service is temporarily unavailable. Try again shortly',
        status: 503,
        detail: 'A required dependency is unavailable.',
        checks: { postgres: 'down' },
      }),
    );
    expect(problem.code).toBe('service-unavailable');
    expect(problem.message).toBe('A required dependency is unavailable.');
    expect(problem.extensions).toEqual({ checks: { postgres: 'down' } });
    expect(problem.fieldErrors).toEqual({});
  });

  it('still produces a problem when the body is not problem details', async () => {
    const problem = await toApiProblem(
      new Response('<html>Bad gateway</html>', { status: 502, statusText: 'Bad Gateway' }),
    );
    expect(problem.status).toBe(502);
    expect(problem.code).toBe('http-error');
    expect(problem.message).toBe('Bad Gateway');

    const empty = await toApiProblem(new Response(null, { status: 500 }));
    expect(empty.message).toBe('The request failed');
  });
});
