import { toApiProblem } from './problem.js';

export interface ApiClientConfig {
  /** The API's origin, for example `https://api.voltdrop.example`. Empty means same origin. */
  readonly baseUrl: string;
  /**
   * Extra headers for every request. TODO(M2): the session or bearer token goes here, but this
   * config is a module-level global, and a server that renders for many people (Next.js) shares one
   * module instance: per-user headers must move to a per-request value before a token is added.
   */
  readonly headers?: () => HeadersInit | Promise<HeadersInit>;
  /** Replaces the global fetch, for tests and server rendering. */
  readonly fetch?: typeof globalThis.fetch;
}

let config: ApiClientConfig = { baseUrl: '' };

/** Call once at start-up, before the first request. */
export function configureApiClient(next: ApiClientConfig): void {
  config = next;
}

function joinUrl(baseUrl: string, path: string): string {
  if (baseUrl === '' || /^https?:\/\//.test(path)) {
    return path;
  }
  return `${baseUrl.replace(/\/+$/, '')}${path.startsWith('/') ? '' : '/'}${path}`;
}

/**
 * The single transport for the generated client (orval's mutator). It returns the parsed JSON
 * body, or undefined when there is none, and throws an ApiProblem for any non-2xx response.
 */
export async function apiFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(config.headers === undefined ? undefined : await config.headers());
  new Headers(init.headers).forEach((value, name) => {
    headers.set(name, value);
  });
  if (!headers.has('accept')) {
    headers.set('accept', 'application/json');
  }

  const response = await (config.fetch ?? globalThis.fetch)(joinUrl(config.baseUrl, url), {
    ...init,
    headers,
  });
  if (!response.ok) {
    throw await toApiProblem(response);
  }
  const text = await response.text();
  return (text === '' ? undefined : JSON.parse(text)) as T;
}
