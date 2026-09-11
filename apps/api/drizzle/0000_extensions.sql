-- PostGIS for zones, addresses and distances (spec §4). pgvector is enabled now for semantic search
-- later (M0 plan §5). IF NOT EXISTS because managed databases may install extensions beforehand.
CREATE EXTENSION IF NOT EXISTS postgis;
--> statement-breakpoint
CREATE EXTENSION IF NOT EXISTS vector;
