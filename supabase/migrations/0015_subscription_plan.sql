-- Subscription tier column on profiles. Placeholder for M1 (no payment yet).
-- M2 will add a separate subscriptions table with Stripe customer/subscription ids,
-- webhook-driven state, and grace periods — but for now we just flip this column
-- when the user clicks "Upgrade" in the pricing UI.

alter table profiles
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'personal', 'family'));

create index if not exists idx_profiles_plan on profiles(plan);
