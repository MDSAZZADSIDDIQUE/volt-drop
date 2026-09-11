// PreToolUse hook for Edit, Write and NotebookEdit (ADR-0009, spec §15). Claude Code sends the tool
// call as JSON on stdin; exit code 2 blocks the call and shows stderr to Claude. Permission deny
// rules can't do this alone, because they can't make an exception for .env.example.
//
// It fails closed: if it can't tell which file the call changes, it blocks the call.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { protectedReason } from './protected-paths.mjs';

// Claude Code sets CLAUDE_PROJECT_DIR; otherwise this file's location gives the repository root.
const projectDir =
  process.env.CLAUDE_PROJECT_DIR ?? fileURLToPath(new URL('../..', import.meta.url));

function block(message) {
  process.stderr.write(`${message}\n`);
  process.exit(2);
}

let input;
try {
  input = JSON.parse(readFileSync(0, 'utf8'));
} catch {
  block("protect-files hook: couldn't read the tool call, so the edit was blocked to be safe.");
}

const toolInput = input?.tool_input ?? {};
const filePath = toolInput.file_path ?? toolInput.notebook_path;
if (typeof filePath !== 'string' || filePath === '') {
  block('protect-files hook: the tool call names no file, so it was blocked to be safe.');
}

const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : projectDir;
const reason = protectedReason(filePath, { projectDir, cwd });
if (reason !== undefined) {
  block(`Claude Code may not change ${filePath}: ${reason} (ADR-0009).`);
}
