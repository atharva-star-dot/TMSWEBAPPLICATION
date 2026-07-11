-- ============================================================================
-- Transport Management System — Supabase schema
-- Multi-tenant: every signup creates its own "company" (tenant).
-- All data (customers, bills) is scoped to a company via company_id + RLS.
-- Run this once in the Supabase SQL editor on a fresh project.
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. COMPANIES  (one row per tenant / business account)
-- ----------------------------------------------------------------------------
create table if not exists public.companies (
  id            uuid primary key default gen_random_uuid(),
  name          text not null,
  gst_no        text,
  address       text,
  phone         text,
  email         text,
  pan_number    text,
  bill_prefix   text not null default 'INV',
  logo_url      text,
  tagline       text,
  bank_name     text,
  account_number text,
  ifsc_code     text,
  sac_code      text default '996791',
  pdf_accent_color text default '#1e3a5c',
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. PROFILES  (one row per auth user; links a login to a company + role)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  company_id    uuid not null references public.companies(id) on delete cascade,
  username      text not null,
  role          text not null default 'staff' check (role in ('admin','staff')),
  created_at    timestamptz not null default now()
);

create unique index if not exists profiles_company_username_idx
  on public.profiles (company_id, lower(username));

-- Helper: current user's company_id (used everywhere in RLS policies)
create or replace function public.current_company_id()
returns uuid
language sql
security definer
stable
as $$
  select company_id from public.profiles where id = auth.uid()
$$;

create or replace function public.current_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id            uuid primary key default gen_random_uuid(),
  company_id    uuid not null references public.companies(id) on delete cascade,
  name          text not null,
  gst_no        text,
  address       text,
  phone         text,
  email         text,
  created_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 4. BILLS
-- ----------------------------------------------------------------------------
create table if not exists public.bills (
  id                    uuid primary key default gen_random_uuid(),
  company_id            uuid not null references public.companies(id) on delete cascade,
  bill_number           text not null,
  invoice_internal_no   text,
  bill_date             date not null default current_date,
  job_description       text,
  driver_name           text,
  vehicle_number        text,
  container_number      text,
  seal_number           text,

  customer_id           uuid references public.customers(id) on delete set null,
  client_address        text,
  client_gst_no         text,
  client_ref_invoice_no text,

  origin_address        text,
  from_location         text,
  to_location            text,
  return_location       text,
  route_particulars     text,
  goods_description     text,
  additional_notes      text,

  transport_charge      numeric(12,2) not null default 0,
  charge_label          text,
  service_charges       numeric(12,2) not null default 0,
  parking_charges       numeric(12,2) not null default 0,
  hold_charges          numeric(12,2) not null default 0,
  hold_description      text,
  pan_amount            numeric(12,2) not null default 0,
  pan_number            text,
  total_freight         numeric(12,2) not null default 0,

  bill_status           text not null default 'Pending' check (bill_status in ('Pending','Delivered','Cancelled')),
  payment_status        text not null default 'Unpaid' check (payment_status in ('Paid','Unpaid','Partial')),

  created_by            uuid references public.profiles(id),
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create unique index if not exists bills_company_billnumber_idx
  on public.bills (company_id, bill_number);

create index if not exists bills_company_idx on public.bills (company_id);
create index if not exists bills_company_date_idx on public.bills (company_id, bill_date);
create index if not exists bills_company_status_idx on public.bills (company_id, bill_status);
create index if not exists bills_company_payment_idx on public.bills (company_id, payment_status);

-- keep updated_at fresh
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_bills_updated_at on public.bills;
create trigger trg_bills_updated_at
  before update on public.bills
  for each row execute function public.set_updated_at();

-- ----------------------------------------------------------------------------
-- 5. Auto bill numbering:  PREFIX-YYYY-0001
-- ----------------------------------------------------------------------------
create or replace function public.next_bill_number(p_company_id uuid)
returns text
language plpgsql
security definer
as $$
declare
  v_prefix text;
  v_year   text := to_char(current_date, 'YYYY');
  v_count  int;
begin
  select bill_prefix into v_prefix from public.companies where id = p_company_id;
  v_prefix := coalesce(v_prefix, 'INV');

  select count(*) + 1 into v_count
  from public.bills
  where company_id = p_company_id
    and bill_number like v_prefix || '-' || v_year || '-%';

  return v_prefix || '-' || v_year || '-' || lpad(v_count::text, 4, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- 6. Signup helper: creates a company + admin profile for a brand-new user
--    Called from the app right after supabase.auth.signUp()
-- ----------------------------------------------------------------------------
create or replace function public.create_company_and_admin(
  p_user_id       uuid,
  p_username      text,
  p_company_name  text,
  p_bill_prefix   text default 'INV'
)
returns uuid
language plpgsql
security definer
as $$
declare
  v_company_id uuid;
begin
  insert into public.companies (name, bill_prefix)
  values (p_company_name, coalesce(nullif(p_bill_prefix,''), 'INV'))
  returning id into v_company_id;

  insert into public.profiles (id, company_id, username, role)
  values (p_user_id, v_company_id, p_username, 'admin');

  return v_company_id;
end;
$$;

-- Helper: invite/create an additional staff/admin user's profile row
-- (the auth user itself must already exist — created via supabase.auth.admin
--  through an API route, or by having the new user sign up with an invite code)
create or replace function public.attach_user_to_company(
  p_user_id    uuid,
  p_username   text,
  p_role       text
)
returns void
language plpgsql
security definer
as $$
begin
  insert into public.profiles (id, company_id, username, role)
  values (p_user_id, public.current_company_id(), p_username, coalesce(p_role,'staff'));
end;
$$;

-- ----------------------------------------------------------------------------
-- 7. AI SETTINGS — Sarthiwala AI provider/key configuration, per company
-- ----------------------------------------------------------------------------
create table if not exists public.ai_settings (
  company_id   uuid primary key references public.companies(id) on delete cascade,
  provider     text not null default 'anthropic' check (provider in ('anthropic','custom')),
  api_key      text,
  model        text not null default 'claude-sonnet-5',
  base_url     text,
  updated_at   timestamptz not null default now()
);

drop trigger if exists trg_ai_settings_updated_at on public.ai_settings;
create trigger trg_ai_settings_updated_at
  before update on public.ai_settings
  for each row execute function public.set_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================
alter table public.companies enable row level security;
alter table public.profiles  enable row level security;
alter table public.customers enable row level security;
alter table public.bills     enable row level security;
alter table public.ai_settings enable row level security;

-- COMPANIES: a user can only see/update their own company
drop policy if exists companies_select on public.companies;
create policy companies_select on public.companies
  for select using (id = public.current_company_id());

drop policy if exists companies_update on public.companies;
create policy companies_update on public.companies
  for update using (id = public.current_company_id());

-- Anyone signed in can create a company (this happens once at signup)
drop policy if exists companies_insert on public.companies;
create policy companies_insert on public.companies
  for insert with check (auth.uid() is not null);

-- PROFILES: user can see all profiles in their own company; only see/insert own row otherwise
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (company_id = public.current_company_id() or id = auth.uid());

drop policy if exists profiles_insert on public.profiles;
create policy profiles_insert on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists profiles_delete on public.profiles;
create policy profiles_delete on public.profiles
  for delete using (
    company_id = public.current_company_id()
    and public.current_role() = 'admin'
    and id <> auth.uid()
  );

-- CUSTOMERS: scoped to company
drop policy if exists customers_all on public.customers;
create policy customers_all on public.customers
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- BILLS: scoped to company
drop policy if exists bills_all on public.bills;
create policy bills_all on public.bills
  for all using (company_id = public.current_company_id())
  with check (company_id = public.current_company_id());

-- AI SETTINGS: all company members can read (chat screen needs to know a key
-- exists); only admins can write.
drop policy if exists ai_settings_select on public.ai_settings;
create policy ai_settings_select on public.ai_settings
  for select using (company_id = public.current_company_id());

drop policy if exists ai_settings_upsert on public.ai_settings;
create policy ai_settings_upsert on public.ai_settings
  for insert with check (company_id = public.current_company_id() and public.current_role() = 'admin');

drop policy if exists ai_settings_update on public.ai_settings;
create policy ai_settings_update on public.ai_settings
  for update using (company_id = public.current_company_id() and public.current_role() = 'admin');

-- ============================================================================
-- STORAGE (company logos)
-- ============================================================================
insert into storage.buckets (id, name, public)
values ('logos', 'logos', true)
on conflict (id) do nothing;

drop policy if exists "logo_public_read" on storage.objects;
create policy "logo_public_read" on storage.objects
  for select using (bucket_id = 'logos');

drop policy if exists "logo_auth_write" on storage.objects;
create policy "logo_auth_write" on storage.objects
  for insert with check (bucket_id = 'logos' and auth.uid() is not null);

drop policy if exists "logo_auth_update" on storage.objects;
create policy "logo_auth_update" on storage.objects
  for update using (bucket_id = 'logos' and auth.uid() is not null);
