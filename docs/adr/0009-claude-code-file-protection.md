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
- `TODO(M0)`: implement the hooks and settings in step 10 of the M0 plan.

## Alternatives considered

- **Deny rules only.** They can't express the `.env.example` exception.
- **A bash and jq hook.** It doesn't run reliably on Windows without extra setup.
