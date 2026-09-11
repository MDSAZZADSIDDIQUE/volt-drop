import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PostgreSqlContainer } from '@testcontainers/postgresql';
import { GenericContainer, Wait } from 'testcontainers';
import type { TestProject } from 'vitest/node';
import { createMigrationPool, migrateDatabase } from '../../scripts/lib/migrations.mjs';

declare module 'vitest' {
  export interface ProvidedContext {
    /** The `postgres` maintenance database, used to create one database per test file. */
    postgresAdminUrl: string;
    /** A fully migrated database that each test file copies. */
    templateDatabase: string;
    valkeyUrl: string;
  }
}

const DOCKER_DIR = fileURLToPath(new URL('../../../../infra/docker/', import.meta.url));
/** The image Docker Compose builds from infra/docker/postgres. */
const POSTGRES_IMAGE = 'voltdrop-local/postgres:18-postgis-3.6-pgvector-0.8.6';
const TEMPLATE_DATABASE = 'voltdrop_template';

/** The pinned image of a Compose service, so the tests run exactly what `pnpm infra:up` runs. */
function composeImage(service: string): string {
  const compose = readFileSync(`${DOCKER_DIR}docker-compose.yml`, 'utf8');
  const block = new RegExp(`^  ${service}:\\n((?:(?: {4}.*)?\\n)*)`, 'm').exec(compose)?.[1];
  const image = block === undefined ? undefined : /^ {4}image: (\S+)$/m.exec(block)?.[1];
  if (image === undefined) {
    throw new Error(`No image for the "${service}" service in docker-compose.yml.`);
  }
  return image;
}

export default async function setup(project: TestProject): Promise<() => Promise<void>> {
  await GenericContainer.fromDockerfile(`${DOCKER_DIR}postgres`).build(POSTGRES_IMAGE, {
    deleteOnExit: false,
  });
  const [postgres, valkey] = await Promise.all([
    new PostgreSqlContainer(POSTGRES_IMAGE)
      .withDatabase(TEMPLATE_DATABASE)
      .withUsername('voltdrop')
      .withPassword('voltdrop')
      .start(),
    new GenericContainer(composeImage('valkey'))
      .withExposedPorts(6379)
      .withWaitStrategy(Wait.forLogMessage('Ready to accept connections'))
      .start(),
  ]);

  const pool = createMigrationPool(postgres.getConnectionUri());
  try {
    await migrateDatabase(pool);
  } finally {
    await pool.end();
  }

  const adminUrl = new URL(postgres.getConnectionUri());
  adminUrl.pathname = '/postgres';
  project.provide('postgresAdminUrl', adminUrl.toString());
  project.provide('templateDatabase', TEMPLATE_DATABASE);
  project.provide('valkeyUrl', `redis://${valkey.getHost()}:${String(valkey.getMappedPort(6379))}`);

  return async () => {
    await Promise.all([postgres.stop(), valkey.stop()]);
  };
}
