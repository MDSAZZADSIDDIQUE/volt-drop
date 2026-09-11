---
name: finish-milestone
description: Finishes the current VoltDrop milestone. Runs the Definition of Done, has the code and security reviewers check the diff, updates docs/PROGRESS.md, writes demo steps, and stops.
disable-model-invocation: true
argument-hint: "[milestone number]"
---

# Finish milestone M$ARGUMENTS

Steps 5 to 7 of the milestone workflow in spec §0. Report exactly what happened: a check that failed, was skipped or wasn't run is reported as such, never as passing.

## 1. Definition of Done (spec §14)

Run each command and record the result, with test counts:

- `pnpm format:check`
- `pnpm lint` (includes the module boundaries)
- `pnpm typecheck`
- `pnpm test` (unit tests with coverage thresholds, and the hook tests)
- `pnpm test:int` (needs Docker; Testcontainers starts its own services)
- `pnpm build`
- `pnpm api:generate`, after which `git status --porcelain -- packages/api-client` must print nothing
- `pnpm check:migrations`
- `pnpm audit --audit-level high`

Hand any failure to the test-triager subagent. Then check the rest of the list against the diff:

- migrations generated, reviewed and applied; seeds updated;
- allow and deny tests for every new endpoint;
- no personal data in logs, search, analytics or error reports;
- new UI meets WCAG 2.2 AA (axe clean; keyboard and screen reader checked);
- policies are configurable, not hard-coded, and the compliance register is updated if a rule was touched (the compliance-check skill);
- module READMEs, ADRs and docs/PROGRESS.md are updated.

## 2. Reviews

1. Write the milestone's diff where the reviewers can read it: `git diff <base>...HEAD > .claude/tmp/review.diff`, where `<base>` is `main` or the commit the milestone started from. `.claude/tmp/` is git-ignored.
2. Run the **code-reviewer** and **security-reviewer** subagents, telling each the milestone and the diff file's path.
3. Fix each finding, or record why not in docs/PROGRESS.md or an ADR. Re-run the checks the fixes affect.

## 3. Update docs/PROGRESS.md

Status, what shipped, known gaps (every `TODO(M<n>)`), deviations from the plan and the spec, environment notes, and next steps. A fresh session must be able to resume from it.

## 4. Stop

Reply with a summary, demo steps (the commands to run and what each shows), test results with numbers, deviations, and open questions. Point out anything that needs the founder's decision. Don't push, open a pull request or start the next milestone without explicit approval.
