// HTTP entrypoint (spec §4). Start with `pnpm --filter @voltdrop/api start` or `pnpm dev`.
import 'reflect-metadata';
import { createApp } from './app/create-app.js';
import { loadConfigOrExit } from './config/load.js';
import { createLogger } from './core/logging/logger.js';

const env = loadConfigOrExit();
const logger = createLogger(env);
const app = await createApp(env, { logger });
// Locally, `localhost` makes Fastify listen on both 127.0.0.1 and ::1 (Windows and Node resolve
// `localhost` to ::1 first) without exposing the API on the network. Containers listen on all interfaces.
const host = env.APP_ENV === 'local' ? 'localhost' : '0.0.0.0';
await app.listen({ port: env.API_PORT, host });
logger.info({ port: env.API_PORT, appEnv: env.APP_ENV }, 'API listening');
