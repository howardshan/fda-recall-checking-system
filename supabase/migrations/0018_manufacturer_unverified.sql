-- Flag cabinet items whose manufacturer is not in the NDC/recall directory.
-- These items are stored but excluded from recall matching and notifications.

alter table medication_items
  add column if not exists manufacturer_unverified boolean not null default false;

create index if not exists idx_med_items_unverified
  on medication_items(user_id) where status = 'active' and manufacturer_unverified;
