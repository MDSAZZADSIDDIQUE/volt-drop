-- policy_versions is append-only (spec §3, §7): a change adds a new version, so every quote, order
-- and return can always be traced to the exact values it used.
CREATE FUNCTION reject_policy_version_change() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'policy_versions is append-only: add a new version instead of changing one'
    USING ERRCODE = 'restrict_violation';
END;
$$;
--> statement-breakpoint
CREATE TRIGGER policy_versions_append_only
  BEFORE UPDATE OR DELETE ON policy_versions
  FOR EACH ROW EXECUTE FUNCTION reject_policy_version_change();
--> statement-breakpoint
CREATE TRIGGER policy_versions_no_truncate
  BEFORE TRUNCATE ON policy_versions
  FOR EACH STATEMENT EXECUTE FUNCTION reject_policy_version_change();
--> statement-breakpoint
-- Version 1 of the policies whose shape is fixed in M0, with the Phase 1 defaults. The schemas in
-- packages/domain/src/policies check these values whenever they are read.
INSERT INTO policy_versions (key, version, value, effective_from, author_id, reason) VALUES
  ('inventory.reservation_ttl_seconds', 1, '600', '2026-01-01T00:00:00Z', NULL,
    'Phase 1 default: 10 minutes (spec v1.1 §3)'),
  ('cart.price_lock_seconds', 1, '1800', '2026-01-01T00:00:00Z', NULL,
    'Phase 1 default: 30 minutes (spec v1.1 §3)'),
  ('checkout.payment_confirmation_hold_seconds', 1, '600', '2026-01-01T00:00:00Z', NULL,
    'Phase 1 default: 600 seconds (ADR-0004)'),
  ('fulfilment.store_acceptance_timers', 1,
    '{"reminderPushSeconds": 60, "phoneCallSeconds": 120, "autoRejectSeconds": 240}',
    '2026-01-01T00:00:00Z', NULL, 'Phase 1 default (spec v1.1 §3)'),
  ('platform.idempotency_replay_window_hours', 1, '24', '2026-01-01T00:00:00Z', NULL,
    'Phase 1 default: 24 hours (spec v1.1 §6)');
