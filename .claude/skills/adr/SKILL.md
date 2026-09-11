---
name: adr
description: Creates the next numbered Architecture Decision Record in docs/adr from the template. Use when a decision changes the spec or the stack, or settles an unspecified detail under the spec §0 decision rule.
argument-hint: "[decision title]"
---

# New ADR: $ARGUMENTS

1. **Decide who decides.** If the decision affects architecture, money movement, legal compliance, security or data retention, it needs the founder: write the ADR with status **Proposed**, then stop and ask. Otherwise, under the §0 decision rule, choose the simplest option that keeps behaviour configurable, and mark the ADR **Accepted**.
2. **Number it.** List docs/adr/, take the highest `NNNN` and add one. Name the file `NNNN-title-in-kebab-case.md`. (0000 is the template.)
3. **Write it** from docs/adr/0000-template.md:
   - a title in sentence case, the date as YYYY-MM-DD, the deciders, and the spec sections it affects;
   - **Context:** the problem and the forces at play, with evidence: documentation links with the date checked, measurements, incidents;
   - **Decision:** stated plainly enough for a new engineer to implement;
   - **Consequences:** what gets easier and harder, with follow-up work tagged `TODO(M<n>)`;
   - **Alternatives considered:** each rejected option and why.
4. **List it.** A decision made under the §0 rule gets a row in the "Engineering decisions" table of docs/open-questions.md, so the founder can review it. When the ADR replaces an older one, set the old one's status to "Superseded by ADR-NNNN".
5. **Follow through.** Update the code, docs and `TODO(M<n>)` entries in docs/PROGRESS.md that the decision affects.
