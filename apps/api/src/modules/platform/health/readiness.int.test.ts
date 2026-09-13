import 'reflect-metadata';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  createTestDatabase,
  integrationEnv,
  startApi,
  type TestDatabase,
} from '../../../../test/integration/harness.js';
import type { Env } from '../../../config/env.js';

/** Asks a fresh API instance whether it is ready, then shuts it down. */
async function ready(env: Env): Promise<request.Response> {
  const app = await startApi(env);
  try {
    return await request(app.getHttpServer()).get('/v1/ready');
  } finally {
    await app.close();
  }
}

describe('readiness', () => {
  let db: TestDatabase;
  let typesense: Server;
  let typesenseUrl: string;

  beforeAll(async () => {
    db = await createTestDatabase();
    // Stands in for Typesense's GET /health.
    typesense = createServer((_request, response) => {
      response.writeHead(200, { 'content-type': 'application/json' });
      response.end('{"ok":true}');
    });
    await new Promise<void>((resolve) => {
      typesense.listen(0, '127.0.0.1', resolve);
    });
    typesenseUrl = `http://127.0.0.1:${String((typesense.address() as AddressInfo).port)}`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      typesense.close((error) => {
        if (error === undefined) {
          resolve();
        } else {
          reject(error);
        }
      });
    });
    await db.drop();
  });

  it('is ready when every dependency is up', async () => {
    const response = await ready(integrationEnv(db.url, { TYPESENSE_URL: typesenseUrl }));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'ready',
      checks: { postgres: 'up', migrations: 'up', valkey: 'up', typesense: 'up' },
    });
  });

  it('stays ready, but degraded, without search', async () => {
    const response = await ready(integrationEnv(db.url));
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      status: 'degraded',
      checks: { postgres: 'up', migrations: 'up', valkey: 'up', typesense: 'down' },
    });
  });

  it('is unavailable until the database is migrated', async () => {
    const empty = await createTestDatabase({ migrated: false });
    try {
      const response = await ready(integrationEnv(empty.url, { TYPESENSE_URL: typesenseUrl }));
      expect(response.status).toBe(503);
      expect(response.body).toMatchObject({
        type: 'urn:voltdrop:problem:service-unavailable',
        checks: { postgres: 'up', migrations: 'down', valkey: 'up', typesense: 'up' },
      });
    } finally {
      await empty.drop();
    }
  });

  it('is unavailable without Valkey', async () => {
    const response = await ready(
      integrationEnv(db.url, { TYPESENSE_URL: typesenseUrl, REDIS_URL: 'redis://127.0.0.1:1' }),
    );
    expect(response.status).toBe(503);
    expect(response.body).toMatchObject({
      checks: { postgres: 'up', migrations: 'up', valkey: 'down', typesense: 'up' },
    });
  });
});
