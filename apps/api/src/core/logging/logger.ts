import type { LoggerService } from '@nestjs/common';
import {
  pino,
  stdSerializers,
  stdTimeFunctions,
  type DestinationStream,
  type LogFn,
  type Logger,
} from 'pino';
import type { Env } from '../../config/env.js';
import { currentCorrelationId } from '../context/request-context.js';
import { redact, redactString } from './redact.js';

interface RequestLike {
  readonly id?: unknown;
  readonly method?: unknown;
  readonly url?: unknown;
}

interface ReplyLike {
  readonly statusCode?: unknown;
}

/** Method and path only. Headers, query strings, bodies and IP addresses never reach the logs. */
export function serializeRequest(request: unknown): Record<string, unknown> {
  if (typeof request !== 'object' || request === null) {
    return {};
  }
  const { id, method, url } = request as RequestLike;
  return { id, method, url: typeof url === 'string' ? url.split('?')[0] : undefined };
}

export function serializeReply(reply: unknown): Record<string, unknown> {
  if (typeof reply !== 'object' || reply === null) {
    return {};
  }
  return { statusCode: (reply as ReplyLike).statusCode };
}

/**
 * Pino calls this before its own serializers, so it first reduces the objects Fastify logs (raw
 * requests and replies) to safe summaries, then redacts personal data from everything (spec §6).
 */
export function prepareLogObject(object: Record<string, unknown>): Record<string, unknown> {
  const prepared: Record<string, unknown> = { ...object };
  if ('req' in prepared) {
    prepared.req = serializeRequest(prepared.req);
  }
  if ('res' in prepared) {
    prepared.res = serializeReply(prepared.res);
  }
  if (prepared.err instanceof Error) {
    prepared.err = stdSerializers.err(prepared.err);
  }
  return redact(prepared) as Record<string, unknown>;
}

export interface CreateLoggerOptions {
  readonly service?: string;
  /** Where log lines go. Defaults to stdout; tests pass a stream to inspect the output. */
  readonly destination?: DestinationStream;
}

export function createLogger(
  env: Pick<Env, 'LOG_LEVEL' | 'APP_ENV'>,
  { service = 'voltdrop-api', destination }: CreateLoggerOptions = {},
): Logger {
  const options = {
    level: env.LOG_LEVEL,
    base: { service, env: env.APP_ENV },
    timestamp: stdTimeFunctions.isoTime,
    formatters: {
      level: (label: string) => ({ level: label }),
      log: prepareLogObject,
    },
    // Errors are already serialised and redacted by prepareLogObject. Pino's default `err`
    // serializer would treat the resulting plain object as a new error and overwrite its type.
    serializers: { err: (value: unknown) => value },
    hooks: {
      // Log messages are redacted too, in case someone interpolates personal data into one.
      logMethod(this: Logger, args: Parameters<LogFn>, method: LogFn): void {
        const safeArgs = (args as unknown[]).map((arg) =>
          typeof arg === 'string' ? redactString(arg) : arg,
        );
        method.apply(this, safeArgs as unknown as Parameters<LogFn>);
      },
    },
    // Every line logged during a request carries its correlation id.
    mixin: (): Record<string, unknown> => {
      const correlationId = currentCorrelationId();
      return correlationId === undefined ? {} : { correlationId };
    },
  };
  return destination === undefined ? pino(options) : pino(options, destination);
}

function toMessage(message: unknown): string {
  if (typeof message === 'string') {
    return message;
  }
  if (message instanceof Error) {
    return message.message;
  }
  // JSON.stringify returns undefined for undefined, functions and symbols.
  const json: unknown = JSON.stringify(message);
  return typeof json === 'string' ? json : String(message);
}

/** Nest passes the logging context (usually a class name) as the last string parameter. */
function splitContext(params: readonly unknown[]): { context?: string; rest: unknown[] } {
  const last = params.at(-1);
  return typeof last === 'string'
    ? { context: last, rest: params.slice(0, -1) }
    : { rest: [...params] };
}

/** Sends Nest's own log lines (start-up, route mapping, errors) through the redacting pino logger. */
export class PinoNestLogger implements LoggerService {
  constructor(private readonly logger: Logger) {}

  log(message: unknown, ...params: unknown[]): void {
    this.logger.info({ context: splitContext(params).context }, toMessage(message));
  }

  error(message: unknown, ...params: unknown[]): void {
    const { context, rest } = splitContext(params);
    const stack = typeof rest[0] === 'string' ? rest[0] : undefined;
    const err = message instanceof Error ? message : undefined;
    this.logger.error({ context, stack, err }, toMessage(message));
  }

  warn(message: unknown, ...params: unknown[]): void {
    this.logger.warn({ context: splitContext(params).context }, toMessage(message));
  }

  debug(message: unknown, ...params: unknown[]): void {
    this.logger.debug({ context: splitContext(params).context }, toMessage(message));
  }

  verbose(message: unknown, ...params: unknown[]): void {
    this.logger.trace({ context: splitContext(params).context }, toMessage(message));
  }

  fatal(message: unknown, ...params: unknown[]): void {
    this.logger.fatal({ context: splitContext(params).context }, toMessage(message));
  }
}
