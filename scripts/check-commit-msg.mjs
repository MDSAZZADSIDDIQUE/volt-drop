// Rejects commit messages whose header doesn't follow Conventional Commits (spec §0, §14).
// Run by the lefthook commit-msg hook with the path of the message file.
import { readFileSync } from 'node:fs';

const TYPES = [
  'build',
  'chore',
  'ci',
  'docs',
  'feat',
  'fix',
  'perf',
  'refactor',
  'revert',
  'style',
  'test',
];
const HEADER = new RegExp(`^(${TYPES.join('|')})(\\([a-z0-9-]+\\))?!?: \\S.{0,99}$`);
// Git writes these headers itself; they aren't authored messages.
const GENERATED = /^(Merge |Revert "|fixup! |squash! |amend! )/;

const messageFile = process.argv[2];
if (!messageFile) {
  console.error('check-commit-msg: pass the commit message file path.');
  process.exit(2);
}

const header =
  readFileSync(messageFile, 'utf8')
    .split(/\r?\n/)
    .find((line) => line.trim() !== '' && !line.startsWith('#')) ?? '';

if (GENERATED.test(header) || HEADER.test(header)) {
  process.exit(0);
}

console.error(
  [
    "This commit message header doesn't follow Conventional Commits:",
    `  ${header}`,
    '',
    'Use: <type>(<optional scope>): <description of at most 100 characters>',
    `Types: ${TYPES.join(', ')}`,
  ].join('\n'),
);
process.exit(1);
