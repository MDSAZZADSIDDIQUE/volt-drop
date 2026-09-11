import 'reflect-metadata';
import { Body, Controller, Get, Module, Post } from '@nestjs/common';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import { validate } from '@readme/openapi-parser';
import { isUuidV7 } from '@voltdrop/domain';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { loadEnv, type Env } from '../config/env.js';
import { createLogger } from '../core/logging/logger.js';
import { Public, RequirePermissions } from '../modules/access/index.js';
import { createApp } from './create-app.js';

const ItemSchema = z.object({ name: z.string().min(1), quantity: z.number().int().min(1) });
type Item = z.infer<typeof ItemSchema>;

@Controller({ path: 'test', version: '1' })
class TestController {
  @Post('items')
  @Public()
  create(@Body({ schema: ItemSchema }) body: Item): Item {
    return body;
  }

  @Get('boom')
  @Public()
  boom(): never {
    throw new Error('internal detail for ada@example.com');
  }

  @Get('private')
  @RequirePermissions('orders:read')
  private(): { ok: boolean } {
    return { ok: true };
  }
}

@Module({ controllers: [TestController] })
class TestModule {}

@Controller({ path: 'undeclared', version: '1' })
class UndeclaredController {
  @Get()
  forgotten(): string {
    return 'should never be served';
  }
}

@Module({ controllers: [UndeclaredController] })
class UndeclaredModule {}

const localEnv = (): Env => loadEnv({ LOG_LEVEL: 'silent' });

async function start(env: Env, extraModules = [TestModule]): Promise<NestFastifyApplication> {
  const app = await createApp(env, { logger: createLogger(env), extraModules });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('API skeleton', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await start(localEnv());
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers /v1/health with ok and a new UUIDv7 request id', async () => {
    const response = await request(app.getHttpServer()).get('/v1/health').expect(200);
    expect(response.body).toEqual({ status: 'ok' });
    expect(isUuidV7(response.headers['x-request-id'])).toBe(true);
  });

  it('reuses a well-formed incoming request id', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .set('x-request-id', 'req-12345678')
      .expect(200);
    expect(response.headers['x-request-id']).toBe('req-12345678');
  });

  it('answers unknown routes with a not-found problem', async () => {
    const response = await request(app.getHttpServer()).get('/v1/nowhere').expect(404);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toEqual({
      type: 'urn:voltdrop:problem:not-found',
      title: "We couldn't find that",
      status: 404,
      instance: response.headers['x-request-id'],
    });
  });

  it('validates bodies with zod and lists each failing field', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/test/items')
      .send({ name: '', quantity: 0 })
      .expect(400);
    expect(response.body).toMatchObject({
      type: 'urn:voltdrop:problem:validation-failed',
      status: 400,
      errors: [
        { path: 'name', message: expect.any(String) as string },
        { path: 'quantity', message: expect.any(String) as string },
      ],
    });
  });

  it('passes valid bodies through', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/test/items')
      .send({ name: 'USB-C cable', quantity: 2 })
      .expect(201);
    expect(response.body).toEqual({ name: 'USB-C cable', quantity: 2 });
  });

  it('rejects malformed JSON with a bad-request problem', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/test/items')
      .set('content-type', 'application/json')
      .send('{"name":')
      .expect(400);
    expect(response.headers['content-type']).toContain('application/problem+json');
    expect(response.body).toMatchObject({ type: 'urn:voltdrop:problem:bad-request' });
  });

  it('rejects bodies over 1 MB with a payload-too-large problem', async () => {
    // Sent in memory rather than over a socket: over a real connection the server replies 413 and
    // closes it mid-upload, and the client can hit ECONNRESET before it reads that reply.
    const response = await app.inject({
      method: 'POST',
      url: '/v1/test/items',
      headers: { 'content-type': 'application/json' },
      payload: JSON.stringify({ name: 'x'.repeat(1_100_000), quantity: 1 }),
    });
    expect(response.statusCode).toBe(413);
    const body: unknown = response.json();
    expect(body).toMatchObject({ type: 'urn:voltdrop:problem:payload-too-large' });
  });

  it('hides internal details of unexpected errors', async () => {
    const response = await request(app.getHttpServer()).get('/v1/test/boom').expect(500);
    expect(response.body).toMatchObject({ type: 'urn:voltdrop:problem:internal-error' });
    expect(JSON.stringify(response.body)).not.toContain('internal detail');
  });

  it('denies permissioned routes until sign-in exists', async () => {
    const response = await request(app.getHttpServer()).get('/v1/test/private').expect(401);
    expect(response.body).toMatchObject({ type: 'urn:voltdrop:problem:unauthenticated' });
  });

  it('lets the web apps read responses, and exposes the correlation and replay headers', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .set('origin', 'http://localhost:5174')
      .expect(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5174');
    const exposed = String(response.headers['access-control-expose-headers']).toLowerCase();
    expect(exposed).toContain('x-request-id');
    expect(exposed).toContain('idempotent-replayed');
    expect(response.headers['access-control-allow-credentials']).toBeUndefined();
  });

  it('answers a preflight for an idempotent POST from a web app', async () => {
    const response = await request(app.getHttpServer())
      .options('/v1/test/items')
      .set('origin', 'http://localhost:3000')
      .set('access-control-request-method', 'POST')
      .set('access-control-request-headers', 'content-type,idempotency-key');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(String(response.headers['access-control-allow-methods'])).toContain('POST');
    expect(String(response.headers['access-control-allow-headers']).toLowerCase()).toContain(
      'idempotency-key',
    );
    expect(response.headers['access-control-max-age']).toBe('600');
  });

  it('gives any other origin no permission to read responses', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/health')
      .set('origin', 'https://evil.example');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();

    const preflight = await request(app.getHttpServer())
      .options('/v1/test/items')
      .set('origin', 'https://evil.example')
      .set('access-control-request-method', 'POST');
    expect(preflight.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('serves a valid OpenAPI 3.1 document outside production', async () => {
    const response = await request(app.getHttpServer()).get('/docs/openapi.json').expect(200);
    const document = response.body as {
      openapi: string;
      paths: Record<string, unknown>;
      components?: { schemas?: Record<string, unknown> };
    };
    expect(document.openapi).toBe('3.1.0');
    expect(Object.keys(document.paths)).toContain('/v1/health');
    expect(Object.keys(document.paths)).toContain('/v1/ready');
    expect(document.components?.schemas).toHaveProperty('Health');
    expect(document.components?.schemas).toHaveProperty('Readiness');

    // Operation ids name the generated client's functions and hooks, so each real route sets its
    // own (for example getHealth) rather than Nest's default, HealthController_health_v1. The
    // test-only controllers above live under /v1/test and are left out.
    const operationIds = Object.entries(document.paths)
      .filter(([path]) => !path.startsWith('/v1/test/'))
      .flatMap(([, pathItem]) =>
        Object.values(pathItem as Record<string, { operationId?: string }>).map(
          (operation) => operation.operationId ?? '(none)',
        ),
      );
    expect(operationIds).toEqual(expect.arrayContaining(['getHealth', 'getReadiness']));
    expect(operationIds.filter((id) => !/^[a-z][A-Za-z0-9]*$/.test(id))).toEqual([]);

    // The validator dereferences in place, so give it a copy.
    const result = await validate(
      structuredClone(document) as unknown as Parameters<typeof validate>[0],
    );
    expect(result).toMatchObject({ valid: true });

    await request(app.getHttpServer()).get('/docs').expect(200);
  });
});

describe('start-up checks and production', () => {
  it('refuses to start when a route declares no access', async () => {
    await expect(start(localEnv(), [UndeclaredModule])).rejects.toThrow(
      /UndeclaredController\.forgotten/,
    );
  });

  it('reports not ready, listing every check, when its dependencies are unreachable', async () => {
    const app = await start(
      loadEnv({
        LOG_LEVEL: 'silent',
        DATABASE_URL: 'postgres://voltdrop:voltdrop@127.0.0.1:1/voltdrop',
        REDIS_URL: 'redis://127.0.0.1:1',
        TYPESENSE_URL: 'http://127.0.0.1:1',
      }),
    );
    try {
      const response = await request(app.getHttpServer()).get('/v1/ready').expect(503);
      expect(response.headers['content-type']).toContain('application/problem+json');
      expect(response.body).toMatchObject({
        type: 'urn:voltdrop:problem:service-unavailable',
        status: 503,
        checks: { postgres: 'down', migrations: 'down', valkey: 'down', typesense: 'down' },
      });
    } finally {
      await app.close();
    }
  }, 15_000);

  it('does not serve the API reference in production', async () => {
    const app = await start({ ...localEnv(), APP_ENV: 'production' });
    try {
      await request(app.getHttpServer()).get('/docs/openapi.json').expect(404);
      await request(app.getHttpServer()).get('/docs').expect(404);
      await request(app.getHttpServer()).get('/v1/health').expect(200);
    } finally {
      await app.close();
    }
  });
});
