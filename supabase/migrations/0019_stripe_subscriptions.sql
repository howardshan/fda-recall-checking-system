-- Stripe subscription state (test/live keys configured via env).

alter table profiles
  add column if not exists stripe_customer_id text;

create unique index if not exists idx_profiles_stripe_customer
  on profiles(stripe_customer_id) where stripe_customer_id is not null;

create table if not exists stripe_subscriptions (
  user_id uuid primary key references auth.users(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text,
  status text not null default 'inactive',
  plan text not null default 'free' check (plan in ('free', 'personal', 'family')),
  billing_cycle text check (billing_cycle in ('monthly', 'annual')),
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_stripe_subs_subscription_id
  on stripe_subscriptions(stripe_subscription_id)
  where stripe_subscription_id is not null;

alter table stripe_subscriptions enable row level security;

create policy "stripe_subs self read" on stripe_subscriptions
  for select using (user_id = auth.uid());
