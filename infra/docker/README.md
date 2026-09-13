# Local infrastructure

Docker Compose runs every service the apps need locally (spec §4). Docker Desktop must be running.

| Command | What it does |
|---|---|
| `pnpm infra:up` | Builds the Postgres image if needed, starts every service, waits until each is healthy, then creates the S3 buckets and their CORS rules (`scripts/infra-init.mjs`) |
| `pnpm infra:down` | Stops the services and keeps their data |
| `pnpm infra:reset` | Stops the services and **deletes** their data volumes |
| `pnpm infra:logs` | Follows the service logs |
| `pnpm infra:smoke` | Checks that local S3 supports presigned PUT, size-limited presigned POST and CORS (`scripts/s3-smoke.mjs`) |

## Services

| Service | Image | Host port | Local credentials |
|---|---|---|---|
| PostgreSQL 18 + PostGIS 3.6 + pgvector 0.8.6 | built from `postgres/Dockerfile` | 5432 | `voltdrop` / `voltdrop`, database `voltdrop` |
| Valkey 9.1 | `valkey/valkey` | 6379 | none |
| Typesense 30.2 | `typesense/typesense` | 8108 | API key `local-dev-typesense-key` |
| SeaweedFS 4.46 (S3 API) | `chrislusf/seaweedfs` | 9000 | `voltdrop-local` / `voltdrop-local-secret` |
| Mailpit 1.31 | `axllent/mailpit` | 1025 (SMTP), 8025 (web inbox) | any |
| Metabase 0.63 (optional) | `metabase/metabase` | 3001 | set up on first visit |

Every port is published on `127.0.0.1`, so the services answer only on this machine: Valkey needs no password, and the Postgres credentials are the ones above, so neither should be reachable from a café or office network. All credentials are local-only placeholders, not secrets. Images are pinned by tag and digest. The Postgres image tracks AWS RDS for PostgreSQL 18: PostGIS is on the same 3.6 line, while pgvector is a later 0.8 patch release than RDS's 0.8.1 (see the Dockerfile). The integration tests build the same image.

- **Metabase** only starts when you ask for it: `docker compose -f infra/docker/docker-compose.yml --profile reporting up -d`.
- **SeaweedFS** replaces MinIO, which no longer publishes images (ADR-0010).

## Stripe webhooks (from M1)

Install the [Stripe CLI](https://docs.stripe.com/stripe-cli), log in with a test-mode account, then forward events to the local API:

```bash
stripe listen --forward-to http://localhost:4000/v1/webhooks/stripe
```

Put the printed signing secret in `STRIPE_WEBHOOK_SECRET` in your `.env`.
