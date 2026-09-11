// PostToolUse hook for Edit and Write (ADR-0009, spec §15). Formats the TypeScript file Claude just
// changed with the repository's Prettier settings and ignore files, as lefthook does for staged
// files. It never blocks: a file Prettier can't parse is left as it is and reported as a
// non-blocking error (exit code 1), which Claude Code shows in the transcript.
import { readFileSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const TYPESCRIPT = /\.(?:[cm]?ts|tsx)$/i;

// Claude Code sets CLAUDE_PROJECT_DIR; otherwise this file's location gives the repository root.
const projectDir =
  process.env.CLAUDE_PROJECT_DIR ?? fileURLToPath(new URL('../..', import.meta.url));

let filePath;
try {
  const input = JSON.parse(readFileSync(0, 'utf8'));
  const candidate = input?.tool_input?.file_path;
  if (typeof candidate === 'string' && candidate !== '') {
    const cwd = typeof input.cwd === 'string' && input.cwd !== '' ? input.cwd : projectDir;
    filePath = path.resolve(cwd, candidate);
  }
} catch {
  // No readable tool call means no file to format.
}

const relative = filePath === undefined ? '' : path.relative(projectDir, filePath);
const insideProject =
  relative !== '' &&
  relative !== '..' &&
  !relative.startsWith(`..${path.sep}`) &&
  !path.isAbsolute(relative);
if (filePath === undefined || !TYPESCRIPT.test(filePath) || !insideProject) {
  process.exit(0);
}

try {
  // Resolved from this file, so it's the repository's own Prettier.
  const prettier = await import('prettier');
  const info = await prettier.getFileInfo(filePath, {
    ignorePath: [path.join(projectDir, '.gitignore'), path.join(projectDir, '.prettierignore')],
  });
  if (!info.ignored && info.inferredParser !== null) {
    // editorconfig: true matches the Prettier CLI, which lefthook runs.
    const options = await prettier.resolveConfig(filePath, { editorconfig: true });
    const source = await readFile(filePath, 'utf8');
    const formatted = await prettier.format(source, { ...options, filepath: filePath });
    if (formatted !== source) {
      await writeFile(filePath, formatted);
    }
  }
} catch (error) {
  const message = error instanceof Error ? (error.message.split('\n')[0] ?? '') : String(error);
  process.stderr.write(`format-file hook: Prettier couldn't format ${relative}: ${message}\n`);
  process.exit(1);
}
