// Fails if a database migration that has already reached the base branch was changed (M0 plan,
// steps 6 and 9: migrations are forward-only). New migrations may be added; the journal may only
// gain entries at the end. Compares commits, not the working tree.
//
// Usage: node scripts/check-migrations.mjs [baseRef]   (default: origin/main; on a push to main, CI
// passes the commit the push replaced)
import { execFileSync } from 'node:child_process';

const MIGRATIONS = 'apps/api/drizzle';
const JOURNAL = `${MIGRATIONS}/meta/_journal.json`;
const baseRef = process.argv[2] ?? 'origin/main';

function git(...args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

let base;
try {
  base = git('merge-base', 'HEAD', baseRef);
} catch {
  console.error(`Can't find ${baseRef}. In CI, check out with fetch-depth: 0.`);
  process.exit(1);
}

const changes = git('diff', '--name-status', '--no-renames', base, 'HEAD', '--', MIGRATIONS)
  .split('\n')
  .filter((line) => line !== '')
  .map((line) => {
    const [status, path] = line.split('\t');
    return { status, path };
  });

const problems = [];
for (const { status, path } of changes) {
  if (status === 'A') {
    continue; // a new migration or snapshot
  }
  if (path === JOURNAL && status === 'M') {
    const before = JSON.parse(git('show', `${base}:${JOURNAL}`)).entries;
    const after = JSON.parse(git('show', `HEAD:${JOURNAL}`)).entries;
    const unchanged = before.every(
      (entry, index) => JSON.stringify(entry) === JSON.stringify(after[index]),
    );
    if (!unchanged) {
      problems.push(`${JOURNAL}: existing entries changed (only adding entries is allowed)`);
    }
    continue;
  }
  problems.push(`${path}: ${status === 'D' ? 'deleted' : 'changed'} after it reached ${baseRef}`);
}

if (problems.length > 0) {
  console.error(
    'Migrations are forward-only: add a new migration instead of editing one that has shipped.',
  );
  for (const problem of problems) {
    console.error(`  - ${problem}`);
  }
  process.exit(1);
}
console.log(`Migrations OK: nothing that reached ${baseRef} has changed.`);
