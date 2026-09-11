import type { IncomingMessage } from 'node:http';
import { VersioningType, type DynamicModule, type Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import type { Logger } from 'pino';
import type { Env } from '../config/env.js';
import { correlationIdFrom, runWithContext } from '../core/context/request-context.js';
import { PinoNestLogger } from '../core/logging/logger.js';
import { buildOpenApiDocument, registerApiReference } from '../core/openapi/openapi.js';
import { ProblemDetailsFilter } from '../core/problems/problem-details.filter.js';
import { createValidationPipe } from '../core/validation/validation.js';
import { ApiModule } from './api.module.js';

/** Request bodies above this are rejected with 413 (spec §12: request size limits). */
const BODY_LIMIT_BYTES = 1024 * 1024;

export interface CreateAppOptions {
  readonly logger: Logger;
  /** Extra modules to mount, for tests. */
  readonly extraModules?: readonly (Type | DynamicModule)[];
}

/**
 * Builds the HTTP application without starting it. `main.ts` then listens on a port; tests call
 * `init()` and send requests in memory; OpenAPI generation reads the document from it.
 */
export async function createApp(
  env: Env,
  { logger, extraModules = [] }: CreateAppOptions,
): Promise<NestFastifyApplication> {
  const adapter = new FastifyAdapter({
    loggerInstance: logger,
    genReqId: (request: IncomingMessage) => correlationIdFrom(request.headers['x-request-id']),
    bodyLimit: BODY_LIMIT_BYTES,
  });

  // Every request runs inside its own context, so logs, outbox events and jobs share its correlation id.
  adapter.getInstance().addHook('onRequest', (request, reply, done) => {
    void reply.header('x-request-id', request.id);
    runWithContext({ correlationId: request.id }, done);
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    ApiModule.forRoot(env, { logger, extraModules }),
    adapter,
    { logger: new PinoNestLogger(logger), abortOnError: false },
  );
  app.enableVersioning({ type: VersioningType.URI });
  // Spec §12: a CORS allowlist. Only the three web apps may read API responses in a browser (the
  // Expo apps aren't browsers). No credentials until sign-in arrives (M2).
  app.enableCors({
    origin: [env.CUSTOMER_WEB_URL, env.ADMIN_URL, env.MERCHANT_PORTAL_URL].map(
      (url) => new URL(url).origin,
    ),
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['content-type', 'idempotency-key', 'x-request-id'],
    exposedHeaders: ['x-request-id', 'idempotent-replayed'],
    credentials: false,
    maxAge: 600,
  });
  app.useGlobalPipes(createValidationPipe());
  app.useGlobalFilters(new ProblemDetailsFilter(logger));
  app.enableShutdownHooks();

  if (env.APP_ENV !== 'production') {
    registerApiReference(app, buildOpenApiDocument(app));
  }
  return app;
}
