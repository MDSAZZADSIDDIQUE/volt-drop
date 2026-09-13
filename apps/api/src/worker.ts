// Worker entrypoint (spec §4). Start with `pnpm --filter @voltdrop/api start:worker` or `pnpm dev`.
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './app/worker.module.js';
import { loadConfigOrExit } from './config/load.js';
import { WorkerRunner } from './core/jobs/worker-runner.js';
import { createLogger, PinoNestLogger } from './core/logging/logger.js';

/** Jobs this process runs at once. Scale out with more worker tasks rather than raising this. */
const CONCURRENCY = 5;

const env = loadConfigOrExit();
const logger = createLogger(env, { service: 'voltdrop-worker' });
const app = await NestFactory.createApplicationContext(WorkerModule.forRoot(env, { logger }), {
  logger: new PinoNestLogger(logger),
  abortOnError: false,
});
const runner = app.get(WorkerRunner);
await runner.start({ concurrency: CONCURRENCY });
logger.info({ appEnv: env.APP_ENV, concurrency: CONCURRENCY }, 'Worker started');

let stopping = false;
async function shutdown(signal: NodeJS.Signals): Promise<void> {
  if (stopping) {
    return;
  }
  stopping = true;
  logger.info({ signal }, 'Worker stopping once its running jobs finish');
  await runner.stop();
  await app.close();
}

for (const signal of ['SIGTERM', 'SIGINT'] as const) {
  process.once(signal, () => {
    void shutdown(signal);
  });
}
