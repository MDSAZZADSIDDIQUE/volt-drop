---
name: golden-scenarios
description: Runs VoltDrop's golden scenario suite (spec §14) and summarises the failures. The suite starts in M1; until then this skill reports that there is nothing to run.
---

# Golden scenarios

`TODO(M1)`: the golden scenario suite doesn't exist yet. M1 adds it, with scenario 1 and a `pnpm golden` script. Until then, say there's nothing to run and stop. Never report the scenarios as passing.

Once the suite exists:

1. Run `pnpm golden` (it needs Docker). Hand a long or failing run to the test-triager subagent, so the output stays out of the main conversation.
2. Report each of the 14 scenarios in spec §14 as passed, failed, or not built yet (with the milestone that builds it).
3. For each failure, give the scenario, the step that failed, the assertion and its output, and the likely root cause with evidence.
4. Golden scenarios must always pass. Never weaken, skip or delete one to get a green run.
