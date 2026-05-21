-- Daily digest tracking. One email per user per day, even if no matches.
-- Idempotency key: notification_preferences.last_digest_sent_at >= today (UTC)
-- means the user already got today's digest; skip them.

alter table notification_preferences
  add column if not exists last_digest_sent_at timestamptz;

create index if not exists idx_prefs_last_digest
  on notification_preferences(last_digest_sent_at);
