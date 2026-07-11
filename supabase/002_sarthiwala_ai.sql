-- ============================================================================
-- Sarthiwala AI — incremental migration
-- Run this AFTER supabase/schema.sql (safe to re-run; every statement is
-- idempotent). Adds: AI provider/key storage per company, and a "Partial"
-- payment status to match the original desktop app's tool schema.
-- ============================================================================

-- 1. Allow "Partial" payment status (original app supports Paid/Unpaid/Partial)
alter table public.bills drop constraint if exists bills_payment_status_check;
alter table public.bills add constraint bills_payment_status_check
  check (payment_status in ('Paid','Unpaid','Partial'));

-- 2. AI provider configuration — one row per company.
--    Mirrors the desktop app's Settings -> "Sarthiwala AI" screen.
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

alter table public.ai_settings enable row level security;

-- Any signed-in company member can read the config (needed so the chat
-- screen knows a key is configured) but only an admin can write it.
drop policy if exists ai_settings_select on public.ai_settings;
create policy ai_settings_select on public.ai_settings
  for select using (company_id = public.current_company_id());

drop policy if exists ai_settings_upsert on public.ai_settings;
create policy ai_settings_upsert on public.ai_settings
  for insert with check (company_id = public.current_company_id() and public.current_role() = 'admin');

drop policy if exists ai_settings_update on public.ai_settings;
create policy ai_settings_update on public.ai_settings
  for update using (company_id = public.current_company_id() and public.current_role() = 'admin');
