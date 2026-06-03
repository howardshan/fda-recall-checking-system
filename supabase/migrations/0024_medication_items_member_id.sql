-- Backfill member_id on medication_items for DBs where the table predates
-- 0013_app_schema.sql (CREATE TABLE IF NOT EXISTS skipped adding the column).

create table if not exists family_members (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  relationship text,
  created_at timestamptz default now()
);

create index if not exists idx_family_members_user on family_members(user_id);

alter table family_members enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'family_members'
      and policyname = 'family_members self all'
  ) then
    create policy "family_members self all" on family_members
      for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;

alter table medication_items
  add column if not exists member_id bigint
  references family_members(id) on delete cascade;

create index if not exists idx_med_items_member
  on medication_items(member_id) where member_id is not null;
