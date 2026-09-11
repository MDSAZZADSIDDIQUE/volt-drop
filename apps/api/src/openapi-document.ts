// Writes the OpenAPI 3.1 document without listening or connecting to anything (M0 plan, step 7).
// `pnpm api:generate` runs it after a build, then orval turns the document into the typed client.
import 'reflect-metadata';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { createApp } from './app/create-app.js';
import { loadEnv } from './config/env.js';
import { createLogger } from './core/logging/logger.js';
import { buildOpenApiDocument } from './core/openapi/openapi.js';

const target = process.argv[2];
if (target === undefined) {
  process.stderr.write('Usage: node dist/openapi-document.js <output.json>\n');
  process.exit(2);
}

// Local defaults only, never the caller's environment, so the document is the same on every machine.
const env = loadEnv({ APP_ENV: 'local', LOG_LEVEL: 'silent' });
const app = await createApp(env, { logger: createLogger(env) });
try {
  const path = resolve(target);
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(buildOpenApiDocument(app), null, 2)}\n`);
} finally {
  await app.close();
}
