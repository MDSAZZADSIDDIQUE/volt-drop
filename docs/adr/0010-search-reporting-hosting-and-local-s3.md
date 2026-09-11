# ADR-0010: Production homes for Typesense and Metabase; SeaweedFS replaces MinIO locally

- **Status:** Accepted. The Typesense Cloud region and contract are to be reconfirmed before M14.
- **Date:** 2026-09-11
- **Deciders:** Founder (kickoff recommendations (c)9 and M0 decision D6, approved 2026-09-11); Claude Code
- **Spec sections:** v1.1 §4 (Search, Files, Reporting, Infrastructure, Local development), §10 (Files), §18 (`S3_ENDPOINT`)

## Context

- v1.0's infrastructure list (ECS Fargate, RDS, ElastiCache, S3 and so on) said nothing about where Typesense or Metabase run in production.
- v1.0 chose MinIO for local S3. MinIO stopped publishing community Docker images in October 2025; the code is now distributed as source only.
- LocalStack's image has needed an auth token since March 2026 (release 2026.03.0), and commercial use needs a paid plan.

## Decision

1. **Typesense in production: Typesense Cloud.**
   - A managed, highly available cluster for production and a single node for staging, in the region closest to eu-west-2 (London if offered).
   - The index holds no personal data (§6), so the privacy impact is low. Typesense is listed in `docs/compliance/subprocessors.md`.
   - Region, data-processing terms and cost are to be confirmed before M14.
   - Fallback: a self-hosted three-node cluster on EC2 in eu-west-2, which would need a new ADR.
2. **Metabase in production.** An ECS Fargate service, with its own application database in RDS. It reads through reporting views on the read-only replica, behind admin SSO.
3. **Local S3: SeaweedFS** (Apache-2.0).
   - Its S3 API is published on host port 9000, so `S3_ENDPOINT` and the adapters don't change.
   - The M0 compose smoke test must prove bucket creation, CORS, presigned PUT and a presigned POST with a content-length-range policy, which M4 needs.
   - If SeaweedFS fails, RustFS (Apache-2.0) is the fallback, recorded in a superseding ADR.

## Consequences

- The M14 Terraform scope is now defined for search and reporting.
- Typesense Cloud adds a vendor contract. Its cost scales with memory for about 100,000 offers, which is small.
- `TODO(M0)`: SeaweedFS in compose, plus the smoke test (M0 plan, step 3).
- `TODO(M14)`: confirm the Typesense Cloud region and data-processing terms; add Typesense and Metabase to Terraform and the sub-processor list.

## Implementation notes

- **2026-09-11 (M0 step 3):** the SeaweedFS 4.46 smoke test (`pnpm infra:smoke`) passed:
  - presigned PUT;
  - presigned POST within a content-length-range policy;
  - rejection of an oversized POST with `EntityTooLarge`;
  - CORS preflight for the local app origins.

  The RustFS fallback isn't needed.
- The AWS SDK's default request checksums (added in 2025) break presigned uploads to S3-compatible stores. S3 clients set `requestChecksumCalculation` and `responseChecksumValidation` to `WHEN_REQUIRED`. `TODO(M4)`: the ObjectStore adapter must do the same.

## Alternatives considered

- **Self-host Typesense on ECS Fargate.** Raft clustering needs stable peers and persistent disks, which fits Fargate poorly. More operations work for a small team.
- **Build our own MinIO images from source.** This is ongoing maintenance and security-patching work for a development-only tool.
- **LocalStack.** It needs an account and, for commercial use, a paid plan.
