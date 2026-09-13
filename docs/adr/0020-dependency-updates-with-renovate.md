# ADR-0020: Dependency updates with Renovate

- **Status:** Accepted
- **Date:** 2026-09-13
- **Deciders:** Founder (chose Renovate, open question P7, on 2026-09-13); Claude Code (the configuration, under the §0 decision rule)
- **Spec sections:** §6 (pin exact dependency versions), §12 (supply chain)

## Context

ADR-0001 set the rules for versions: exact pins, only releases at least a day old (pnpm 11's minimum release age), one React at exactly the version Expo pins, reviewed install scripts, and an ADR before any major upgrade. CI pins GitHub Actions to commit SHAs, and Docker images are pinned by tag and digest. Keeping all of that current by hand doesn't scale, so open question P7 asked whether Dependabot or Renovate should propose updates. The founder chose Renovate.

Renovate's options and presets were checked against its documentation on 2026-09-13 (https://docs.renovatebot.com/configuration-options/, https://docs.renovatebot.com/key-concepts/minimum-release-age/, and the config, default, helpers and security preset pages).

## Decision

`renovate.json` configures it:

1. **`config:best-practices`**, which adds, on top of Renovate's recommended settings: the Dependency Dashboard issue, grouping of known monorepos, Docker image digests, GitHub Actions pinned to digests, a 3-day minimum release age for npm packages (stricter than pnpm's own day), and weekly lockfile maintenance.
2. **Exact pins everywhere except peer dependencies and `engines`** (`:pinAllExceptPeerDependencies`), which keep their ranges.
3. **GitHub Actions stay pinned to commit SHAs** with the release in a comment (`helpers:pinGitHubActionDigestsToSemver`), as `ci.yml` already does.
4. **A weekly schedule:** pull requests open before 6am on Mondays, Europe/London time, at most 5 open and 2 an hour. OSV vulnerability alerts are switched on, and `pnpm dedupe` runs after each update.
5. **Groups:** non-major updates to development-only packages arrive in one weekly pull request, and Loom's Fontsource typefaces move together.
6. **Waiting for approval on the Dependency Dashboard:** every major version (each needs an ADR, ADR-0001), and the Expo SDK, React Native, NativeWind and React as one group, because React must stay at exactly the version Expo pins.
7. **Nothing merges on its own.** Every Renovate pull request goes through CI and a person's review, with Conventional Commit messages (`fix(deps)` for runtime dependencies, `chore(deps)` for the rest).

Renovate runs as the Mend Renovate GitHub App, which the founder installs for this repository once `renovate.json` is on `main`, so Renovate starts from this configuration instead of opening its own onboarding pull request.

## Consequences

- The packages held back by the release-age rule (docs/PROGRESS.md) get their updates from Renovate instead of by hand.
- Renovate can't check a release's age during lockfile maintenance; pnpm 11 enforces its own minimum release age when it rewrites the lockfile, so that gap stays covered.
- A new dependency with an install script still fails CI until someone reviews it and lists it in `allowBuilds` (ADR-0001).
- If the configuration is ever invalid, Renovate reports it in an issue and does nothing else.

## Alternatives considered

- **Dependabot.** Built into GitHub, with no app to install; the founder chose Renovate.
- **Self-hosted Renovate in GitHub Actions.** Full control, but it needs a token secret and its own workflow to maintain; the hosted app does the same job.
