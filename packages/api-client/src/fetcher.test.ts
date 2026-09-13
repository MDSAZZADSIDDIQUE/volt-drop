import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, configureApiClient } from './fetcher.js';
import { ApiProblem } from './problem.js';

function fakeFetch(response: Response) {
  return vi.fn<typeof globalThis.fetch>(() => Promise.resolve(response));
}

function requestOf(fetch: ReturnType<typeof fakeFetch>): { url: string; init: RequestInit } {
  const call = fetch.mock.calls[0];
  if (call === undefined) {
    throw new Error('fetch was not called');
  }
  const [input, init] = call;
  return { url: input instanceof Request ? input.url : input.toString(), init: init ?? {} };
}

describe('apiFetch', () => {
  afterEach(() => {
    configureApiClient({ baseUrl: '' });
  });

  it('joins the base URL, sends JSON headers and returns the parsed body', async () => {
    const fetch = fakeFetch(Response.json({ status: 'ok' }));
    configureApiClient({ baseUrl: 'https://api.voltdrop.example/', fetch });

    await expect(apiFetch('/v1/health', { method: 'GET' })).resolves.toEqual({ status: 'ok' });
    const { url, init } = requestOf(fetch);
    expect(url).toBe('https://api.voltdrop.example/v1/health');
    expect(init.method).toBe('GET');
    expect(new Headers(init.headers).get('accept')).toBe('application/json');
  });

  it('adds configured headers, which request headers can override', async () => {
    const fetch = fakeFetch(Response.json({}));
    configureApiClient({
      baseUrl: '',
      fetch,
      headers: () => ({ 'x-client': 'merchant-portal', 'accept-language': 'en-GB' }),
    });

    await apiFetch('/v1/orders', { headers: { 'accept-language': 'cy-GB' } });
    const headers = new Headers(requestOf(fetch).init.headers);
    expect(requestOf(fetch).url).toBe('/v1/orders');
    expect(headers.get('x-client')).toBe('merchant-portal');
    expect(headers.get('accept-language')).toBe('cy-GB');
  });

  it('passes the abort signal through', async () => {
    const fetch = fakeFetch(Response.json({}));
    configureApiClient({ baseUrl: '', fetch });
    const controller = new AbortController();

    await apiFetch('/v1/health', { signal: controller.signal });
    expect(requestOf(fetch).init.signal).toBe(controller.signal);
  });

  it('returns undefined when the response has no body', async () => {
    configureApiClient({ baseUrl: '', fetch: fakeFetch(new Response(null, { status: 204 })) });
    await expect(apiFetch('/v1/things/1', { method: 'DELETE' })).resolves.toBeUndefined();
  });

  it('throws an ApiProblem for an error response', async () => {
    const body = {
      type: 'urn:voltdrop:problem:not-found',
      title: "We couldn't find that",
      status: 404,
    };
    configureApiClient({
      baseUrl: '',
      fetch: fakeFetch(
        new Response(JSON.stringify(body), {
          status: 404,
          headers: { 'content-type': 'application/problem+json' },
        }),
      ),
    });

    const error: unknown = await apiFetch('/v1/nowhere').catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(ApiProblem);
    expect(error).toMatchObject({ status: 404, code: 'not-found' });
  });
});
