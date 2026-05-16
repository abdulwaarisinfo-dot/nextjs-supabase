
create table public.shop_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade unique not null,
  shop_name text not null,
  address text default '',
  phone text default '',
  created_at timestamptz default now()
);

create table public.bills (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  bill_number text not null,
  customer_name text default '',
  customer_phone text default '',
  items jsonb default '[]'::jsonb,
  subtotal numeric(12,2) default 0,
  discount_total numeric(12,2) default 0,
  total numeric(12,2) default 0,
  note text default '',
  created_at timestamptz default now()
);

create index bills_user_created_idx on public.bills (user_id, created_at desc);

alter table public.shop_profiles enable row level security;
alter table public.bills enable row level security;

create policy "own shop_profiles select" on public.shop_profiles for select using (auth.uid() = user_id);
create policy "own shop_profiles insert" on public.shop_profiles for insert with check (auth.uid() = user_id);
create policy "own shop_profiles update" on public.shop_profiles for update using (auth.uid() = user_id);
create policy "own shop_profiles delete" on public.shop_profiles for delete using (auth.uid() = user_id);

create policy "own bills select" on public.bills for select using (auth.uid() = user_id);
create policy "own bills insert" on public.bills for insert with check (auth.uid() = user_id);
create policy "own bills update" on public.bills for update using (auth.uid() = user_id);
create policy "own bills delete" on public.bills for delete using (auth.uid() = user_id);
