---
name: start-milestone
description: Plans the next VoltDrop milestone. Reads spec §16 and every section it references, drafts docs/plans/M<n>-plan.md, and stops for approval. Use when starting a milestone or when asked to plan one.
argument-hint: "[milestone number]"
---

# Start a milestone

Milestone requested: M$ARGUMENTS. If no number was given, take the next milestone from docs/PROGRESS.md and confirm it with the founder before planning.

This skill is steps 1 to 3 of the milestone workflow in spec §0 (docs/spec/voltdrop-master-prompt.md): read, plan, stop. Write no product code.

1. **Check it's time.** Read docs/PROGRESS.md. The previous milestone must be finished, and the founder must have approved starting this one. If not, stop and ask.
2. **Read.** In the spec: §0, the milestone in §16, every section its **Refs** line names, §6 and §14. Then the ADRs that touch those sections, docs/open-questions.md (anything that blocks this milestone), and the rows of docs/compliance/register.md that name it.
3. **Check the outside world.** For each third-party service or library the milestone depends on, read its current official documentation, and note the URL and today's date. Check the newest versions of packages you'll add; pnpm installs only versions at least a day old.
4. **Write `docs/plans/M<n>-plan.md`,** with docs/plans/M0-plan.md as the model:
   - the acceptance criteria from §16, each with how it will be proven (which test, which demo step);
   - decisions that need the founder, each with options and a recommendation;
   - prerequisites (accounts, keys, answers to open questions);
   - implementation steps: small vertical slices, each ending green and committed;
   - schema changes, endpoints (with the permissions each needs), jobs and events, and screens;
   - tests mapped to the acceptance criteria, including the golden scenarios this milestone makes pass;
   - risks, what's deliberately out of scope, open questions, and the demo script.
5. **Record** new questions in docs/open-questions.md, and any detail decided under the §0 decision rule in an ADR (the adr skill).
6. **Stop.** Summarise the plan, list the decisions that need approval, and wait. Don't implement anything until the founder approves.
