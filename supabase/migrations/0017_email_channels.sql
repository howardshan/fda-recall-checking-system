-- Split email into instant recall alerts vs daily digest (user-configurable).

alter table notification_preferences
  add column if not exists email_instant_enabled boolean not null default true,
  add column if not exists email_digest_enabled boolean not null default true;

comment on column notification_preferences.email_instant_enabled is
  'Send class-styled email as soon as a recall match is detected.';
comment on column notification_preferences.email_digest_enabled is
  'Send one daily summary email (matches or all-clear).';
