CREATE TABLE "feature_flags" (
	"key" text NOT NULL,
	"scope_type" text NOT NULL,
	"scope_id" text DEFAULT '' NOT NULL,
	"enabled" boolean NOT NULL,
	"version" integer DEFAULT 1 NOT NULL,
	"updated_by" uuid,
	"reason" text NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "feature_flags_pkey" PRIMARY KEY("key","scope_type","scope_id"),
	CONSTRAINT "feature_flags_scope_type_known" CHECK ("feature_flags"."scope_type" in ('global', 'zone', 'merchant', 'user_segment')),
	CONSTRAINT "feature_flags_scope_id_matches_type" CHECK (("feature_flags"."scope_type" = 'global') = ("feature_flags"."scope_id" = ''))
);
--> statement-breakpoint
CREATE TABLE "idempotency_keys" (
	"scope" text NOT NULL,
	"key" text NOT NULL,
	"fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"lock_token" uuid,
	"locked_until" timestamp with time zone,
	"response_status" integer,
	"response_body" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"completed_at" timestamp with time zone,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY("scope","key"),
	CONSTRAINT "idempotency_keys_status_known" CHECK ("idempotency_keys"."status" in ('in_progress', 'completed')),
	CONSTRAINT "idempotency_keys_completed_has_response" CHECK (("idempotency_keys"."status" = 'completed') = ("idempotency_keys"."response_status" is not null))
);
--> statement-breakpoint
CREATE TABLE "outbox" (
	"id" uuid PRIMARY KEY NOT NULL,
	"aggregate_type" text NOT NULL,
	"aggregate_id" text NOT NULL,
	"event_type" text NOT NULL,
	"event_version" integer NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text,
	"occurred_at" timestamp with time zone DEFAULT now() NOT NULL,
	"dispatched_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "outbox_deliveries" (
	"event_id" uuid NOT NULL,
	"handler" text NOT NULL,
	"delivered_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "outbox_deliveries_pkey" PRIMARY KEY("event_id","handler")
);
--> statement-breakpoint
CREATE TABLE "policy_versions" (
	"key" text NOT NULL,
	"version" integer NOT NULL,
	"value" jsonb NOT NULL,
	"effective_from" timestamp with time zone NOT NULL,
	"author_id" uuid,
	"reason" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "policy_versions_pkey" PRIMARY KEY("key","version"),
	CONSTRAINT "policy_versions_version_positive" CHECK ("policy_versions"."version" >= 1),
	CONSTRAINT "policy_versions_reason_present" CHECK (length(trim("policy_versions"."reason")) > 0)
);
--> statement-breakpoint
ALTER TABLE "outbox_deliveries" ADD CONSTRAINT "outbox_deliveries_event_id_outbox_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."outbox"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "outbox_undispatched_idx" ON "outbox" USING btree ("id") WHERE "outbox"."dispatched_at" is null;