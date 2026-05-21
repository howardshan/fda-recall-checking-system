-- Track SMS dispatch independently from email dispatch on notifications so a
-- failure in one channel doesn't suppress the other on the next pass.

alter table notifications
  add column if not exists sms_sent_at timestamptz;

create index if not exists idx_notif_pending_sms
  on notifications(sms_sent_at) where sms_sent_at is null;
