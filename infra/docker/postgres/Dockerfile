# Local PostgreSQL for VoltDrop: PostgreSQL 18 with PostGIS 3.6 (matching AWS RDS for PostgreSQL 18)
# and pgvector (spec §4). The integration tests (Testcontainers) build and use this same image.
FROM postgis/postgis:18-3.6@sha256:60f6ad1d21ea86a67d47780b9a0d1e1d200500f62b19293fa834d0dea80b8677

# pgvector comes prebuilt from the PostgreSQL project's apt repository (already configured in the
# base image), pinned to an exact package version so builds take seconds. RDS supports 0.8.1, but
# that package isn't published for PostgreSQL 18, so this is a later 0.8 patch release. Vectors are
# unused until later milestones; re-check the RDS version before any vector feature ships.
ARG PGVECTOR_PACKAGE_VERSION=0.8.6-1.pgdg13+1

RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends "postgresql-18-pgvector=${PGVECTOR_PACKAGE_VERSION}"; \
    rm -rf /var/lib/apt/lists/*

# Extra databases for local tools. The extensions themselves are enabled by migrations, not here.
COPY initdb/ /docker-entrypoint-initdb.d/
