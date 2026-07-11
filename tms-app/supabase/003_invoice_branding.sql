-- ============================================================================
-- Invoice branding — incremental migration
-- Run after schema.sql + 002_sarthiwala_ai.sql (idempotent).
-- Adds the fields needed for a professional, per-company invoice PDF:
-- tagline, bank details, SAC code, and a customizable accent color used for
-- the invoice/GST-report table header background.
-- ============================================================================

alter table public.companies add column if not exists tagline text;
alter table public.companies add column if not exists bank_name text;
alter table public.companies add column if not exists account_number text;
alter table public.companies add column if not exists ifsc_code text;
alter table public.companies add column if not exists sac_code text default '996791';
alter table public.companies add column if not exists pdf_accent_color text default '#1e3a5c';
