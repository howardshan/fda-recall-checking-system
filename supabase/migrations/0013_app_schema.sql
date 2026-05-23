-- App schema for SOW v3.0 Phase 1+2.
--
-- Tables added:
--   profiles                  — public mirror of auth.users with display fields
--   family_members            — Phase 2; created in Phase 1 with self-only support
--   medication_items          — user's personal medicine cabinet
--   notifications             — per-(user, item, recall) alert records
--   notification_preferences  — per-user channel + class toggles
--
-- All user-scoped tables have RLS policies "user_id = auth.uid()".
-- A trigger seeds profiles + notification_preferences on auth.users insert.

-- profiles --------------------------------------------------------------
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "profiles self read" on profiles
  for select using (id = auth.uid());
create policy "profiles self update" on profiles
  for update using (id = auth.uid()) with check (id = auth.uid());

-- family_members -------------------------------------------------------
create table if not exists family_members (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text,
  created_at timestamptz default now()
);
create index if not exists idx_family_members_user on family_members(user_id);

alter table family_members enable row level security;
create policy "family_members self all" on family_members
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- medication_items ----------------------------------------------------
create table if not exists medication_items (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  member_id bigint references family_members(id) on delete cascade,
  product_name text not null,
  manufacturer text not null,
  product_ndc text,
  lot_number text,
  expected_stop_date date,
  status text not null default 'active' check (status in ('active', 'paused', 'deleted')),
  added_at timestamptz default now(),
  updated_at timestamptz default now()
);
create index if not exists idx_med_items_user_active
  on medication_items(user_id) where status = 'active';
create index if not exists idx_med_items_ndc
  on medication_items(product_ndc) where product_ndc is not null;
create index if not exists idx_med_items_member
  on medication_items(member_id) where member_id is not null;

alter table medication_items enable row level security;
create policy "med_items self all" on medication_items
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notifications -------------------------------------------------------
create table if not exists notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  medication_item_id bigint references medication_items(id) on delete cascade,
  recall_id bigint references recalls(id) on delete cascade,
  classification text,
  status text not null default 'unread' check (status in ('unread', 'read', 'dismissed')),
  email_sent_at timestamptz,
  created_at timestamptz default now(),
  unique (user_id, medication_item_id, recall_id)
);
create index if not exists idx_notif_user_status
  on notifications(user_id, status, created_at desc);
create index if not exists idx_notif_pending_email
  on notifications(email_sent_at) where email_sent_at is null;

alter table notifications enable row level security;
create policy "notifications self all" on notifications
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- notification_preferences --------------------------------------------
create table if not exists notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email_enabled boolean default true,
  sms_enabled boolean default false,
  phone_number text,
  alert_on_class_i boolean default true,
  alert_on_class_ii boolean default true,
  alert_on_class_iii boolean default false,
  alert_after_stop_date boolean default false,
  updated_at timestamptz default now()
);

alter table notification_preferences enable row level security;
create policy "prefs self all" on notification_preferences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Auto-create profile + default preferences on signup -----------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1))
  );
  insert into public.notification_preferences (user_id) values (new.id);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
