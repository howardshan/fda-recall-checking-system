-- Idempotent log for automatic credit refunds on subscription.deleted (Plan B).

create table if not exists stripe_refund_events (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_subscription_id text not null,
  stripe_event_id text not null,
  stripe_customer_id text not null,
  amount_cents integer not null default 0,
  stripe_refund_id text,
  status text not null check (status in ('success', 'failed', 'skipped')),
  error_message text,
  created_at timestamptz not null default now()
);

create unique index if not exists idx_stripe_refund_events_event_id
  on stripe_refund_events(stripe_event_id);

create index if not exists idx_stripe_refund_events_user_id
  on stripe_refund_events(user_id);

alter table stripe_refund_events enable row level security;

-- Server-only table (service role); no client policies.
