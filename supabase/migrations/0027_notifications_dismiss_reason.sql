-- Track system auto-dismiss when monitoring is paused (vs user-dismissed).
alter table notifications
  add column if not exists dismiss_reason text;

alter table notifications
  drop constraint if exists notifications_dismiss_reason_check;

alter table notifications
  add constraint notifications_dismiss_reason_check
  check (dismiss_reason is null or dismiss_reason = 'monitoring_paused');

comment on column notifications.dismiss_reason is
  'monitoring_paused = auto-dismissed when medication monitoring was paused; user dismiss leaves null.';
