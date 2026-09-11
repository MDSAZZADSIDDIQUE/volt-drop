import { AsyncLocalStorage } from 'node:async_hooks';
import { newId } from '@voltdrop/domain';

/** Per-request context, available anywhere in the call chain without passing it through every function. */
export interface RequestContext {
  /** Carried through logs, outbox events and jobs, so one request can be traced end to end. */
  readonly correlationId: string;
}

const storage = new AsyncLocalStorage<RequestContext>();

export function runWithContext<T>(context: RequestContext, fn: () => T): T {
  return storage.run(context, fn);
}

export function currentContext(): RequestContext | undefined {
  return storage.getStore();
}

export function currentCorrelationId(): string | undefined {
  return storage.getStore()?.correlationId;
}

// A caller's X-Request-Id is only reused if it looks like an identifier, so arbitrary text (or personal
// data) can't be smuggled into every log line.
const CORRELATION_ID_PATTERN = /^[A-Za-z0-9._:-]{8,128}$/;

/** Reuses a well-formed incoming `X-Request-Id`, or starts a new correlation id. */
export function correlationIdFrom(header: string | readonly string[] | undefined): string {
  const candidate = typeof header === 'string' ? header : header?.[0];
  return candidate !== undefined && CORRELATION_ID_PATTERN.test(candidate) ? candidate : newId();
}
