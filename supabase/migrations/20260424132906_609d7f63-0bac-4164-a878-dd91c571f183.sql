
-- =====================================================
-- ENUMS
-- =====================================================
create type public.app_role as enum ('admin', 'customer');

create type public.order_status as enum (
  'pending',      -- created, awaiting admin confirmation of payment
  'confirmed',    -- admin confirmed payment received
  'in_progress',  -- service being delivered
  'completed',    -- service delivered
  'cancelled',    -- admin cancelled (after client request via WhatsApp)
  'refunded'      -- admin marked as refunded
);

create type public.service_category as enum ('guards', 'events', 'mascots');

-- =====================================================
-- PROFILES (one per auth user)
-- =====================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  email      text not null unique,
  phone      text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

-- =====================================================
-- USER ROLES (separate table — never on profiles)
-- =====================================================
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
alter table public.user_roles enable row level security;

-- security-definer role check (no RLS recursion)
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- =====================================================
-- ORDERS
-- =====================================================
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  user_id uuid not null references auth.users(id) on delete restrict,
  status public.order_status not null default 'pending',
  notes text,                       -- e.g. "Get a Quote" free-text
  is_quote_request boolean not null default false,
  admin_note text,                  -- internal admin comment
  discount_label text,              -- e.g. "Repeat customer 10%"
  discount_amount numeric(12,2),    -- optional discount currency value
  cancellation_reasons text[],      -- checkbox reasons supplied by client via WA
  cancellation_note text,           -- free-text from client
  cancelled_at timestamptz,
  refunded_at timestamptz,
  confirmed_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.orders enable row level security;
create index idx_orders_user on public.orders(user_id);
create index idx_orders_status on public.orders(status);
create index idx_orders_created on public.orders(created_at desc);

-- =====================================================
-- ORDER ITEMS
-- =====================================================
create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  category public.service_category not null,    -- guards | events | mascots
  service_name text not null,                   -- "Private Security Detail", "Ushers" ...
  quantity integer not null check (quantity > 0),
  location text,                                -- venue / address
  service_date timestamptz,                     -- when service is needed
  duration text,                                -- "Full day (8hrs)", "1 week"
  config jsonb not null default '{}'::jsonb,    -- extras: armed, dogs, vehicle_type, mascot_character, etc
  created_at timestamptz not null default now()
);
alter table public.order_items enable row level security;
create index idx_order_items_order on public.order_items(order_id);

-- =====================================================
-- TRIGGERS: timestamps + auto profile + order numbering
-- =====================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.touch_updated_at();
create trigger trg_orders_updated before update on public.orders
  for each row execute function public.touch_updated_at();

-- auto-create profile + customer role on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, first_name, last_name, email, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    new.email,
    coalesce(new.raw_user_meta_data->>'phone', '')
  )
  on conflict (id) do nothing;

  insert into public.user_roles (user_id, role)
  values (new.id, 'customer')
  on conflict (user_id, role) do nothing;

  -- seed first admin
  if lower(new.email) = lower('mkguards@yahoo.com') then
    insert into public.user_roles (user_id, role)
    values (new.id, 'admin')
    on conflict (user_id, role) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- order number generator: MK-YYYYMMDD-XXXX
create or replace function public.generate_order_number()
returns trigger
language plpgsql
as $$
begin
  if new.order_number is null or new.order_number = '' then
    new.order_number := 'MK-' || to_char(now(),'YYYYMMDD') || '-' ||
                        upper(substr(replace(gen_random_uuid()::text,'-',''),1,5));
  end if;
  return new;
end $$;

create trigger trg_orders_number before insert on public.orders
  for each row execute function public.generate_order_number();

-- =====================================================
-- RLS POLICIES
-- =====================================================
-- profiles: owner read/update; admin read all
create policy "profiles self select" on public.profiles
  for select using (auth.uid() = id);
create policy "profiles admin select" on public.profiles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "profiles self update" on public.profiles
  for update using (auth.uid() = id);
create policy "profiles self insert" on public.profiles
  for insert with check (auth.uid() = id);

-- user_roles: owner can read own roles; admin read all; only admin can insert/delete (admin-promotes-admin)
create policy "roles self select" on public.user_roles
  for select using (auth.uid() = user_id);
create policy "roles admin select" on public.user_roles
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "roles admin insert" on public.user_roles
  for insert with check (public.has_role(auth.uid(), 'admin'));
create policy "roles admin delete" on public.user_roles
  for delete using (public.has_role(auth.uid(), 'admin'));

-- orders: customers see/insert own; admins see/update all
create policy "orders self select" on public.orders
  for select using (auth.uid() = user_id);
create policy "orders admin select" on public.orders
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "orders self insert" on public.orders
  for insert with check (auth.uid() = user_id);
create policy "orders admin update" on public.orders
  for update using (public.has_role(auth.uid(), 'admin'));
-- IMPORTANT: customers CANNOT update or delete orders. Cancellation goes through WhatsApp + admin.

-- order_items: visibility tied to parent order
create policy "items self select" on public.order_items
  for select using (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
create policy "items admin select" on public.order_items
  for select using (public.has_role(auth.uid(), 'admin'));
create policy "items self insert" on public.order_items
  for insert with check (
    exists (select 1 from public.orders o where o.id = order_id and o.user_id = auth.uid())
  );
