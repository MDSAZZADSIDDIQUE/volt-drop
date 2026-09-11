import { randomUUID } from 'node:crypto';
import type { DynamicModule, INestApplicationContext, Type } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestFastifyApplication } from '@nestjs/platform-fastify';
import pg from 'pg';
import { inject } from 'vitest';
import { createApp } from '../../src/app/create-app.js';
import { WorkerModule } from '../../src/app/worker.module.js';
import { loadEnv, type Env } from '../../src/config/env.js';
import { createLogger } from '../../src/core/logging/logger.js';
import type { Clock } from '../../src/core/time/clock.js';

/** A clock that only moves when a test moves it. */
export class FakeClock implements Clock {
  constructor(private time = new Date('2026-09-11T12:00:00Z')) {}

  now(): Date {
    return this.time;
  }

  advance(milliseconds: number): void {
    this.time = new Date(this.time.getTime() + milliseconds);
  }
}

/** The worker's module graph without starting the worker: services, database and queue. */
export async function createContext(
  env: Env,
  extraModules: readonly (Type | DynamicModule)[] = [],
): Promise<INestApplicationContext> {
  return NestFactory.createApplicationContext(
    WorkerModule.forRoot(env, { logger: createLogger(env), extraModules }),
    { logger: false, abortOnError: false },
  );
}

/** The HTTP application, initialised for in-memory requests with supertest. */
export async function startApi(
  env: Env,
  extraModules: readonly (Type | DynamicModule)[] = [],
): Promise<NestFastifyApplication> {
  const app = await createApp(env, { logger: createLogger(env), extraModules });
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

export interface TestDatabase {
  readonly url: string;
  drop(): Promise<void>;
}

async function withAdmin(work: (client: pg.Client) => Promise<unknown>): Promise<void> {
  const client = new pg.Client({ connectionString: inject('postgresAdminUrl') });
  await client.connect();
  try {
    await work(client);
  } finally {
    await client.end();
  }
}

/**
 * A database of its own for one test file: by default a copy of the migrated template, so every
 * file starts from the same state; with `migrated: false`, an empty one.
 */
export async function createTestDatabase({ migrated = true } = {}): Promise<TestDatabase> {
  const name = `test_${randomUUID().replaceAll('-', '')}`;
  const template = migrated ? ` template "${inject('templateDatabase')}"` : '';
  await withAdmin((client) => client.query(`create database "${name}"${template}`));
  const url = new URL(inject('postgresAdminUrl'));
  url.pathname = `/${name}`;
  return {
    url: url.toString(),
    drop: () =>
      withAdmin((client) => client.query(`drop database if exists "${name}" with (force)`)),
  };
}

/** Local configuration pointing at the test containers. Typesense isn't started, so it reads as down. */
export function integrationEnv(
  databaseUrl: string,
  overrides: Readonly<Record<string, string>> = {},
): Env {
  return loadEnv({
    LOG_LEVEL: 'silent',
    DATABASE_URL: databaseUrl,
    REDIS_URL: inject('valkeyUrl'),
    TYPESENSE_URL: 'http://127.0.0.1:1',
    ...overrides,
  });
}
