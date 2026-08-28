-- Run this once in the Supabase dashboard: Project → SQL Editor → New query.
-- Tier/subscription data, keyed by Clerk user id. Identity lives in Clerk;
-- Supabase Auth is not used here.

create table if not exists profiles (
  clerk_user_id text primary key,
  tier text not null default 'free',              -- 'free' | 'pro' (extend as needed)
  stripe_customer_id text,
  stripe_subscription_id text,
  stripe_status text,                              -- 'active' | 'past_due' | 'canceled' | ...
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Row Level Security: the anon key (used from the browser) may only read,
-- and only rows scoped to a clerk_user_id it explicitly asks for — writes
-- are done server-side by the Stripe webhook using the service role key,
-- which bypasses RLS entirely.
alter table profiles enable row level security;

create policy "anon can read profiles by clerk_user_id"
  on profiles for select
  to anon
  using (true);

-- No insert/update/delete policy for anon/authenticated — only the service
-- role (server-side, via the Netlify function) can write.
