// Tests for the Claude Code hooks (ADR-0009). Run with `pnpm test:hooks`, which `pnpm test` includes.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';
import { protectedReason } from './protected-paths.mjs';

const hooksDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(hooksDir, '..', '..');

/** Runs a hook the way Claude Code does: the tool call as JSON on stdin. */
function runHook(script, payload, projectDir) {
  return spawnSync(process.execPath, [path.join(hooksDir, script)], {
    input: typeof payload === 'string' ? payload : JSON.stringify(payload),
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_PROJECT_DIR: projectDir },
  });
}

describe('protectedReason', () => {
  const projectDir = path.resolve(tmpdir(), 'voltdrop-project');

  const blocked = [
    '.env',
    'apps/api/.env',
    '.env.local',
    '.env.production',
    'apps/customer-web/.env.development.local',
    '.ENV',
    'certs/server.pem',
    'secrets/signing.key',
    'CERTS/SERVER.PEM',
    'infra/terraform/terraform.tfstate',
    'infra/terraform/terraform.tfstate.backup',
    'infra/terraform/.terraform/providers/lock.json',
    'packages/api-client/src/generated/voltdrop.ts',
    'packages/api-client/src/generated/models/order.ts',
    'Packages/API-Client/src/Generated/voltdrop.ts',
    'apps/api/drizzle/meta/_journal.json',
    'apps/api/drizzle/meta/0003_snapshot.json',
  ];
  for (const file of blocked) {
    it(`blocks ${file}`, () => {
      assert.notEqual(protectedReason(path.join(projectDir, file), { projectDir }), undefined);
    });
  }

  const allowed = [
    '.env.example',
    'apps/api/.env.example',
    'apps/api/src/config/env.ts',
    'docs/env.md',
    'packages/domain/src/keys.ts',
    'packages/api-client/src/fetcher.ts',
    'packages/api-client/src/generated-notes.md',
    'packages/api-client/openapi.json',
    'infra/terraform/main.tf',
    // New migrations are written by hand or by drizzle-kit; only meta/ is off limits.
    'apps/api/drizzle/0003_add_orders.sql',
    'apps/api/src/modules/orders/schema.ts',
  ];
  for (const file of allowed) {
    it(`allows ${file}`, () => {
      assert.equal(protectedReason(path.join(projectDir, file), { projectDir }), undefined);
    });
  }

  it('resolves a relative path against the working directory', () => {
    const cwd = path.join(projectDir, 'packages', 'api-client');
    assert.notEqual(protectedReason('src/generated/voltdrop.ts', { projectDir, cwd }), undefined);
    assert.equal(protectedReason('src/fetcher.ts', { projectDir, cwd }), undefined);
  });

  it('blocks secrets outside the project too', () => {
    assert.notEqual(
      protectedReason(path.resolve(tmpdir(), 'elsewhere', '.env'), { projectDir }),
      undefined,
    );
  });

  it("protects only this project's generated client", () => {
    const other = path.resolve(tmpdir(), 'other', 'packages', 'api-client', 'src', 'generated');
    assert.equal(protectedReason(path.join(other, 'voltdrop.ts'), { projectDir }), undefined);
  });
});

describe('protect-files hook', () => {
  it('blocks an edit to the generated client with exit code 2 and says what to do instead', () => {
    const result = runHook(
      'protect-files.mjs',
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: path.join(repoRoot, 'packages/api-client/src/generated/voltdrop.ts'),
          old_string: 'a',
          new_string: 'b',
        },
      },
      repoRoot,
    );
    assert.equal(result.status, 2);
    assert.match(result.stderr, /pnpm api:generate/);
  });

  it('blocks a notebook edit by its notebook_path', () => {
    const result = runHook(
      'protect-files.mjs',
      {
        tool_name: 'NotebookEdit',
        tool_input: { notebook_path: path.join(repoRoot, 'certs', 'notes.key'), new_source: '' },
      },
      repoRoot,
    );
    assert.equal(result.status, 2);
  });

  it('allows .env.example', () => {
    const result = runHook(
      'protect-files.mjs',
      {
        tool_name: 'Write',
        tool_input: { file_path: path.join(repoRoot, '.env.example'), content: '' },
      },
      repoRoot,
    );
    assert.equal(result.status, 0, result.stderr);
    assert.equal(result.stderr, '');
  });

  it("blocks when it can't read the tool call", () => {
    assert.equal(runHook('protect-files.mjs', 'not json', repoRoot).status, 2);
  });

  it('blocks when the tool call names no file', () => {
    assert.equal(
      runHook('protect-files.mjs', { tool_name: 'Write', tool_input: {} }, repoRoot).status,
      2,
    );
  });
});

describe('format-file hook', () => {
  const project = mkdtempSync(path.join(tmpdir(), 'voltdrop-format-'));
  const outside = mkdtempSync(path.join(tmpdir(), 'voltdrop-outside-'));
  after(() => {
    rmSync(project, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  });
  writeFileSync(path.join(project, '.prettierrc.json'), JSON.stringify({ singleQuote: true }));
  writeFileSync(path.join(project, '.prettierignore'), 'ignored.ts\n');

  const unformatted = 'const greeting   =   "hello"\n';

  function edited(file, content) {
    writeFileSync(file, content);
    const result = runHook(
      'format-file.mjs',
      { tool_name: 'Write', tool_input: { file_path: file, content } },
      project,
    );
    return { result, after: readFileSync(file, 'utf8') };
  }

  it("formats an edited TypeScript file with the project's Prettier config", () => {
    const { result, after } = edited(path.join(project, 'greeting.ts'), unformatted);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(after, "const greeting = 'hello';\n");
  });

  it('formats .tsx files too', () => {
    const { after } = edited(
      path.join(project, 'hello.tsx'),
      'export const Hello = () => <p>hi</p>',
    );
    assert.equal(after, 'export const Hello = () => <p>hi</p>;\n');
  });

  it('leaves files in .prettierignore alone', () => {
    const { result, after } = edited(path.join(project, 'ignored.ts'), unformatted);
    assert.equal(result.status, 0, result.stderr);
    assert.equal(after, unformatted);
  });

  it('leaves files that are not TypeScript alone', () => {
    const { after } = edited(path.join(project, 'data.json'), '{"a":1}');
    assert.equal(after, '{"a":1}');
  });

  it('leaves files outside the project alone', () => {
    const { after } = edited(path.join(outside, 'elsewhere.ts'), unformatted);
    assert.equal(after, unformatted);
  });

  it("reports a file Prettier can't parse without blocking, and leaves it as it is", () => {
    const { result, after } = edited(path.join(project, 'broken.ts'), 'const = ;\n');
    assert.equal(result.status, 1);
    assert.match(result.stderr, /broken\.ts/);
    assert.equal(after, 'const = ;\n');
  });
});
