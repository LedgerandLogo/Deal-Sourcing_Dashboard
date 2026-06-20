-- Run this in Supabase SQL Editor (left sidebar -> SQL Editor -> New query)

-- BUYERS TABLE
create table buyers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  name text,
  phone text,
  areas text,
  max_budget numeric,
  notes text,
  created_at timestamptz default now()
);

-- DEALS TABLE
create table deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null default auth.uid(),
  address text,
  postcode text,
  asking_price numeric,
  market_value numeric,
  seller_name text,
  seller_phone text,
  buyer_id uuid references buyers(id) on delete set null,
  stage text default 'lead',
  sourcing_fee_pct numeric default 2,
  notes text,
  created_at timestamptz default now()
);

-- ROW LEVEL SECURITY: each user only sees their own data
alter table buyers enable row level security;
alter table deals enable row level security;

create policy "Users manage their own buyers"
  on buyers for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users manage their own deals"
  on deals for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
