# ADR-0009: Claude Code file protection: hook script with exceptions, plus read denies for secrets

- **Status:** Accepted
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendation (c)8, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §15 (Hooks and permissions), Appendix A

## Context

v1.0 said to "block edits to `.env*`". But M0 must create `.env.example` (§18), which that pattern also matches. Appendix A says never to edit the generated API client by hand, yet nothing enforced it. And blocking edits alone doesn't stop real secrets being *read* into the model's context.

Claude Code's permission docs (checked 2026-09-11, https://code.claude.com/docs/en/permissions) say that deny rules are evaluated first and can't carry allowlist exceptions. A `.env*` deny rule would therefore block `.env.example` too. The docs also say that a `Read` deny rule blocks Edit and Write on the same path.

## Decision

1. A PreToolUse hook (matcher `Edit|Write|NotebookEdit`) runs `node .claude/hooks/protect-files.mjs` in exec form, so the same script works on Windows and Linux. It blocks:
   - `.env` and `.env.*`, except `.env.example`;
   - `*.pem` and `*.key`;
   - Terraform state (`*.tfstate`, `*.tfstate.*`, `.terraform/**`);
   - `packages/api-client/src/generated/**`.

   It exits with code 2 and a reason, and a unit test covers it.
2. `permissions.deny` includes `Read(.env)` and `Read(.env.local)`, so real secrets never enter Claude's context.
3. A PostToolUse hook runs Prettier on edited `.ts` and `.tsx` files.
4. Git-level checks stay in lefthook, so they apply to every contributor.

## Consequences

- `.env.example` stays editable, while secrets and generated code stay protected.
- Hooks are plain Node scripts, with no jq or bash dependency, so they work on this Windows machine and in CI.
- Implemented in M0 step 10. The implementation notes below record the details.

## Alternatives considered

- **Deny rules only.** They can't express the `.env.example` exception.
- **A bash and jq hook.** It doesn't run reliably on Windows without extra setup.

## Implementation notes (M0 step 10, 2026-09-12)

Checked against the Claude Code documentation on 2026-09-12 (https://code.claude.com/docs/en/hooks, https://code.claude.com/docs/en/permissions and https://code.claude.com/docs/en/settings), using Claude Code 2.1.263.

- **Hook commands.** `.claude/settings.json` runs both hooks in exec form: `"command": "node"`, with the script path (`${CLAUDE_PROJECT_DIR}/.claude/hooks/...`) in `args`. Claude Code spawns Node directly, with no shell, so the same entry works on Windows and Linux.
- **File protection.** `.claude/hooks/protect-files.mjs` reads the tool call from stdin, checks `tool_input.file_path` (or `notebook_path` for NotebookEdit) against the rules in `protected-paths.mjs`, and exits with code 2 and a reason when the file is protected. Matching ignores case, as the Windows and macOS file systems do, and the secret-file rules apply outside the project too. It fails closed: it blocks a tool call it can't read, or one that names no file. It keeps Claude Code's default hook timeout (10 minutes), because a hook that times out blocks nothing.
- **Formatting.** `.claude/hooks/format-file.mjs` formats edited `.ts`, `.tsx`, `.mts` and `.cts` files inside the project with the repository's Prettier, its config, `.editorconfig` and ignore files, so the result matches lefthook's `prettier --write`. It never blocks: when Prettier can't parse a file, it leaves the file alone and exits with code 1, which Claude Code shows as a non-blocking error.
- **Tests.** `.claude/hooks/hooks.test.mjs` (Node's test runner, run by `pnpm test`) covers every protected pattern and exception, both input fields, the fail-closed cases, and the formatter end to end.
- **Read denies.** `Read(.env)`, `Read(.env.local)` and `Read(.env.*.local)`. A bare file name matches at any depth. A `Read` deny also blocks Edit and Write on the same path, and the file commands Claude Code recognises in Bash (such as `cat`, `head` and `sed`) and shell redirections.
- **Edit denies as a second layer.** The protected patterns that have no exceptions also have `Edit` deny rules: `*.pem`, `*.key`, `*.tfstate`, `*.tfstate.*`, `.terraform/**` and `/packages/api-client/src/generated/**`. Unlike the hook, deny rules also cover shell redirections and the file commands Claude Code recognises. `.env.*` can't have one, because `.env.example` must stay editable.
- **Limits.** Neither the hooks nor the deny rules see files that a script or other subprocess opens for itself (which is why `pnpm api:generate` can still write the client), or a command that reads files without naming them. Only OS-level sandboxing would close that gap, and it isn't enabled. The project settings load only when Claude Code starts at the repository root.
