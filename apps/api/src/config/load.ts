import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { EnvError, loadEnv, type Env } from './env.js';

/** The repository's root .env, read for local development only (spec §18). */
const ROOT_ENV_FILE = fileURLToPath(new URL('../../../../.env', import.meta.url));

/**
 * Loads and validates configuration for an entrypoint. On invalid config it prints which keys are
 * wrong (never their values) and exits, so the process refuses to boot (spec §6).
 */
export function loadConfigOrExit(): Env {
  if ((process.env.APP_ENV ?? 'local') === 'local' && existsSync(ROOT_ENV_FILE)) {
    // Variables already set in the environment win over the file.
    process.loadEnvFile(ROOT_ENV_FILE);
  }
  try {
    return loadEnv(process.env);
  } catch (error) {
    if (error instanceof EnvError) {
      process.stderr.write(`${error.message}\n`);
      process.exit(1);
    }
    throw error;
  }
}
