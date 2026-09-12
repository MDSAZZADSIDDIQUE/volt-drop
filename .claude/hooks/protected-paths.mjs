// The files Claude's file tools may not change (ADR-0009, spec §15). protect-files.mjs applies
// these rules as a PreToolUse hook; they live in their own file so they can be unit tested.
import path from 'node:path';

// Written by a generator, never by hand. New migrations are fine; their snapshots and journal
// belong to drizzle-kit (.claude/rules/database.md).
const GENERATED_PATHS = ['packages/api-client/src/generated/', 'apps/api/drizzle/meta/'];

/**
 * Why Claude may not change `filePath`, or `undefined` when it may. A relative `filePath` is
 * resolved against `cwd`. Matching ignores case, as the Windows and macOS file systems do.
 *
 * @param {string} filePath
 * @param {{ projectDir: string, cwd?: string }} dirs
 * @returns {string | undefined}
 */
export function protectedReason(filePath, { projectDir, cwd = projectDir }) {
  const absolute = path.resolve(cwd, filePath);
  const segments = absolute.toLowerCase().split(/[\\/]+/);
  const name = segments.at(-1) ?? '';

  if (name === '.env' || (name.startsWith('.env.') && name !== '.env.example')) {
    return 'environment files can hold real secrets. Only .env.example may be edited: document new variables there';
  }
  if (name.endsWith('.pem') || name.endsWith('.key')) {
    return 'key and certificate files can hold secrets';
  }
  if (name.endsWith('.tfstate') || name.includes('.tfstate.') || segments.includes('.terraform')) {
    return 'Terraform state is written by Terraform, never by hand';
  }

  const relative = path.relative(projectDir, absolute);
  const insideProject =
    relative !== '' &&
    relative !== '..' &&
    !relative.startsWith(`..${path.sep}`) &&
    !path.isAbsolute(relative);
  const relativePosix = relative.split(path.sep).join('/').toLowerCase();
  if (insideProject && GENERATED_PATHS.some((prefix) => relativePosix.startsWith(prefix))) {
    return relativePosix.startsWith('apps/api/drizzle/meta/')
      ? "drizzle-kit writes the migration journal and snapshots. Change a module's schema.ts, then run pnpm db:generate"
      : 'the API client is generated. Change the API, then run pnpm api:generate';
  }
  return undefined;
}
