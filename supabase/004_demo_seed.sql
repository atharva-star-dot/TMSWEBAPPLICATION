-- ============================================================================
-- Sarthiwala Control Room — Demo Seed & API Infrastructure
-- Migration: 004_demo_seed.sql
-- Idempotent: safe to run multiple times without duplicating or corrupting data.
-- Does NOT touch any existing tenant data.
-- ============================================================================

-- 1. Ensure schema extensions & columns exist
alter table public.companies add column if not exists api_token text;
alter table public.bills add column if not exists due_date date;

-- 2. Dedicated API tokens table with RLS
create table if not exists public.api_tokens (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies(id) on delete cascade,
  token       text not null unique,
  name        text not null default 'Read-only API Token',
  role        text not null default 'read_only' check (role in ('read_only', 'read_write')),
  created_at  timestamptz not null default now()
);

alter table public.api_tokens enable row level security;

drop policy if exists "api_tokens_select" on public.api_tokens;
create policy "api_tokens_select" on public.api_tokens
  for select using (
    company_id = 'd0000000-0000-0000-0000-000000000001'::uuid
    or company_id = public.current_company_id()
  );

drop policy if exists "api_tokens_admin_manage" on public.api_tokens;
create policy "api_tokens_admin_manage" on public.api_tokens
  for all using (
    company_id = public.current_company_id() and public.current_role() = 'admin'
  );

-- 3. Dedicated Voice State table for serverless persistence (Fire TV / Alexa sync)
create table if not exists public.voice_state (
  company_id  uuid primary key references public.companies(id) on delete cascade,
  highlight   text,
  text        text not null default '',
  updated_at  bigint not null default 0
);

alter table public.voice_state enable row level security;

drop policy if exists "voice_state_public_read" on public.voice_state;
create policy "voice_state_public_read" on public.voice_state
  for select using (
    company_id = 'd0000000-0000-0000-0000-000000000001'::uuid
    or company_id = public.current_company_id()
  );

drop policy if exists "voice_state_modify" on public.voice_state;
create policy "voice_state_modify" on public.voice_state
  for all using (
    company_id = 'd0000000-0000-0000-0000-000000000001'::uuid
    or company_id = public.current_company_id()
  );

-- 4. Seed the isolated DEMO company
insert into public.companies (
  id,
  name,
  gst_no,
  address,
  phone,
  email,
  bill_prefix,
  api_token,
  tagline,
  bank_name,
  account_number,
  ifsc_code,
  sac_code,
  pdf_accent_color
)
values (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'Vadane Roadlines (Demo)',
  '27AABCU9603R1ZM',
  'Plot 42, Transport Nagar, Nigdi, Pune, Maharashtra 411044',
  '+91 98220 12345',
  'demo@sarthiwala.com',
  'DEMO',
  'sarthiwala_demo_token_2026',
  'Safe & Timely Logistics across Maharashtra',
  'State Bank of India',
  '39845720194',
  'SBIN0001234',
  '996791',
  '#1e3a5c'
)
on conflict (id) do update set
  name = excluded.name,
  api_token = excluded.api_token,
  address = excluded.address,
  phone = excluded.phone;

-- 5. Seed API token for the DEMO company
insert into public.api_tokens (
  id,
  company_id,
  token,
  name,
  role
)
values (
  'd0000000-0000-0000-0000-000000000002'::uuid,
  'd0000000-0000-0000-0000-000000000001'::uuid,
  'sarthiwala_demo_token_2026',
  'Demo Fleet Read Token',
  'read_only'
)
on conflict (token) do update set
  company_id = excluded.company_id,
  role = excluded.role;

-- 6. Initial voice state for DEMO company
insert into public.voice_state (
  company_id,
  highlight,
  text,
  updated_at
)
values (
  'd0000000-0000-0000-0000-000000000001'::uuid,
  null,
  'Sarthiwala Control Room ready. Ask Alexa about truck location, trips, or payments.',
  0
)
on conflict (company_id) do nothing;

-- 7. Seed Demo Customers
insert into public.customers (id, company_id, name, gst_no, address, phone, email)
values
  ('d0000000-0000-0000-0000-000000000011'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Shree Steel Corp', '27AAACS1234A1Z1', 'MIDC Chakan, Pune', '+91 98221 00001', 'accounts@shreesteel.com'),
  ('d0000000-0000-0000-0000-000000000012'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Gujarat Agro Industries', '24AABCG5678B1Z2', 'GIDC Vapi, Gujarat', '+91 98221 00002', 'dispatch@gujaratagro.com'),
  ('d0000000-0000-0000-0000-000000000013'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Tata Motors Vendor Hub', '27AAATT9999C1Z3', 'Bhosari Industrial Estate, Pune', '+91 98221 00003', 'logistics@tatavendors.com'),
  ('d0000000-0000-0000-0000-000000000014'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Reliance FMCG Supply', '27AABCR4444D1Z4', 'Navi Mumbai Logistics Park', '+91 98221 00004', 'billing@rfmcg.com'),
  ('d0000000-0000-0000-0000-000000000015'::uuid, 'd0000000-0000-0000-0000-000000000001'::uuid, 'Mahindra Auto Feeder', '27AABCM7777E1Z5', 'Igatpuri Works, Nashik', '+91 98221 00005', 'transport@mahindrafeeder.com')
on conflict (id) do update set
  name = excluded.name,
  address = excluded.address;

-- 8. Seed 12 Demo Bills across 12 distinct vehicles
-- Mix of:
--  - In-progress / on-time trips (Pending, bill_date = today or yesterday)
--  - Delayed trips (Pending, bill_date = 2-3 days ago)
--  - Idle vehicles (Delivered)
--  - Paid, Unpaid, and Partial payment status
--  - Due dates from current_date + 0 to current_date + 5 days
--  - Maharashtra transport corridors

insert into public.bills (
  id,
  company_id,
  bill_number,
  bill_date,
  due_date,
  job_description,
  driver_name,
  vehicle_number,
  container_number,
  seal_number,
  customer_id,
  client_address,
  origin_address,
  from_location,
  to_location,
  route_particulars,
  goods_description,
  transport_charge,
  total_freight,
  bill_status,
  payment_status,
  additional_notes
)
values
  -- Truck 1: On trip, payment due in 3 days
  (
    'd0000000-0000-0000-0000-000000000101'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0001',
    current_date,
    current_date + interval '3 days',
    'Industrial Goods Transport',
    'Ramesh Pawar',
    'MH 12 QR 4021',
    'MSKU1092834',
    'SL-90123',
    'd0000000-0000-0000-0000-000000000011'::uuid,
    'Shree Steel Corp, Pune',
    'Chakan MIDC',
    'Pune',
    'Bengaluru',
    'Pune -> Satara -> Kolhapur -> Bengaluru (NH48)',
    'Steel coils, 14 t',
    18500,
    18500,
    'Pending',
    'Unpaid',
    'On time. Regular highway run.'
  ),

  -- Truck 2: On trip, already paid
  (
    'd0000000-0000-0000-0000-000000000102'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0002',
    current_date,
    current_date + interval '5 days',
    'FMCG Distribution',
    'Sunil Jadhav',
    'MH 14 GT 7788',
    'TGHU5510293',
    'SL-77881',
    'd0000000-0000-0000-0000-000000000014'::uuid,
    'Reliance FMCG Supply, Navi Mumbai',
    'Talegaon Dabhade',
    'Pune',
    'Mumbai',
    'Pune -> Lonavala -> Khopoli -> Mumbai (Expy)',
    'Packaged FMCG, 9 t',
    14000,
    14000,
    'Pending',
    'Paid',
    'Express transit.'
  ),

  -- Truck 3: Delayed trip, due today (0 days)
  (
    'd0000000-0000-0000-0000-000000000103'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0003',
    current_date - interval '2 days',
    current_date,
    'Agricultural Cargo',
    'Vijay Shinde',
    'MH 12 AB 3310',
    'CMAU8821094',
    'SL-33109',
    'd0000000-0000-0000-0000-000000000012'::uuid,
    'Gujarat Agro Industries, Vapi',
    'Pimpalgaon APMC',
    'Nashik',
    'Surat',
    'Nashik -> Valsad -> Vapi -> Surat (NH48)',
    'Onions, 16 t',
    42000,
    42000,
    'Pending',
    'Unpaid',
    'Heavy traffic near Vapi check-post causing delay.'
  ),

  -- Truck 4: Delivered / Idle, payment due in 1 day
  (
    'd0000000-0000-0000-0000-000000000104'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0004',
    current_date - interval '4 days',
    current_date + interval '1 day',
    'Heavy Auto Forgings',
    'Amit Kulkarni',
    'MH 04 CD 5522',
    'KKFU4019283',
    'SL-55220',
    'd0000000-0000-0000-0000-000000000013'::uuid,
    'Tata Motors Vendor Hub, Pune',
    'Bhosari MIDC',
    'Pune',
    'Nagpur',
    'Pune -> Ahmednagar -> Jalna -> Nagpur (Samruddhi)',
    'Automotive stampings, 12 t',
    52000,
    52000,
    'Delivered',
    'Unpaid',
    'Unloaded at Butibori yard. Vehicle parked and ready for next load.'
  ),

  -- Truck 5: On trip, partial payment, due in 2 days
  (
    'd0000000-0000-0000-0000-000000000105'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0005',
    current_date,
    current_date + interval '2 days',
    'Engine Castings Export',
    'Ganesh Patil',
    'MH 15 EF 9012',
    'HLXU9920192',
    'SL-90128',
    'd0000000-0000-0000-0000-000000000015'::uuid,
    'Mahindra Auto Feeder, Igatpuri',
    'Ambad MIDC, Nashik',
    'Nashik',
    'JNPT Nhava Sheva',
    'Nashik -> Kasara Ghat -> Kalyan -> JNPT Port',
    'Export engine heads, 18 t',
    31500,
    31500,
    'Pending',
    'Partial',
    'Container export gate-in slot scheduled for tomorrow morning.'
  ),

  -- Truck 6: Delayed trip, due in 4 days
  (
    'd0000000-0000-0000-0000-000000000106'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0006',
    current_date - interval '3 days',
    current_date + interval '4 days',
    'Sugar Bags Movement',
    'Santosh Shinde',
    'MH 09 KL 6633',
    'SITU3019284',
    'SL-66331',
    'd0000000-0000-0000-0000-000000000011'::uuid,
    'Shree Steel Corp (Food Division)',
    'Shirol Co-op Mill',
    'Kolhapur',
    'Pune',
    'Kolhapur -> Karad -> Satara -> Pune',
    'Refined sugar, 20 t',
    24000,
    24000,
    'Pending',
    'Unpaid',
    'Minor tire puncture repaired near Shirwal.'
  ),

  -- Truck 7: Delivered / Idle, paid
  (
    'd0000000-0000-0000-0000-000000000107'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0007',
    current_date - interval '5 days',
    current_date - interval '1 day',
    'Industrial Chemicals',
    'Deepak More',
    'MH 20 OP 1144',
    'TEXU7710294',
    'SL-11440',
    'd0000000-0000-0000-0000-000000000013'::uuid,
    'Tata Motors Vendor Hub',
    'Waluj MIDC',
    'Aurangabad',
    'Mumbai',
    'Chhatrapati Sambhajinagar -> Samruddhi -> Thane -> Mumbai',
    'Solvent drums, 10 t',
    28000,
    28000,
    'Delivered',
    'Paid',
    'Trip completed. Awaiting loading in Bhiwandi.'
  ),

  -- Truck 8: On trip, due in 5 days
  (
    'd0000000-0000-0000-0000-000000000108'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0008',
    current_date,
    current_date + interval '5 days',
    'Textile Consignment',
    'Rahul Deshmukh',
    'MH 12 XY 8899',
    'MEDU2201948',
    'SL-88995',
    'd0000000-0000-0000-0000-000000000014'::uuid,
    'Reliance FMCG Supply',
    'Hadapsar Industrial Estate',
    'Pune',
    'Solapur',
    'Pune -> Daund -> Indapur -> Solapur (NH65)',
    'Spun yarn boxes, 11 t',
    19500,
    19500,
    'Pending',
    'Unpaid',
    'Smooth cruising on NH65.'
  ),

  -- Truck 9: On trip, due today (0 days)
  (
    'd0000000-0000-0000-0000-000000000109'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0009',
    current_date - interval '1 day',
    current_date,
    'Banana / Fruit Refrigerated Load',
    'Sachin Chavan',
    'MH 31 ZA 2244',
    'CXRU9910283',
    'SL-22441',
    'd0000000-0000-0000-0000-000000000012'::uuid,
    'Gujarat Agro Industries',
    'Raver APMC Hub',
    'Jalgaon',
    'Pune',
    'Jalgaon -> Chalisgaon -> Ahmednagar -> Pune',
    'Fresh fruit crates, 15 t',
    34000,
    34000,
    'Pending',
    'Unpaid',
    'Passing Shikrapur; ETA under 2 hours.'
  ),

  -- Truck 10: Delivered / Idle, due in 3 days
  (
    'd0000000-0000-0000-0000-000000000110'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0010',
    current_date - interval '3 days',
    current_date + interval '3 days',
    'Steel Billets',
    'Pravin Gaikwad',
    'MH 11 BC 7711',
    'MSCU4410291',
    'SL-77119',
    'd0000000-0000-0000-0000-000000000011'::uuid,
    'Shree Steel Corp',
    'MIDC Satara',
    'Satara',
    'Pune',
    'Satara -> Shirwal -> Pune (NH48)',
    'Rolled steel billets, 16 t',
    16000,
    16000,
    'Delivered',
    'Unpaid',
    'Delivered to warehouse at Tathawade.'
  ),

  -- Truck 11: On trip, paid
  (
    'd0000000-0000-0000-0000-000000000111'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0011',
    current_date,
    current_date + interval '4 days',
    'Pharmaceutical Consumables',
    'Nitin Bhosale',
    'MH 04 JK 9900',
    'BNSU6610293',
    'SL-99002',
    'd0000000-0000-0000-0000-000000000014'::uuid,
    'Reliance FMCG Supply (Pharma)',
    'Wagle Estate Thane',
    'Mumbai',
    'Goa',
    'Mumbai -> Panvel -> Chiplun -> Sawantwadi -> Panaji (NH66)',
    'Tablets & medical packing, 8 t',
    48000,
    48000,
    'Pending',
    'Paid',
    'Scenic coastal highway corridor transit.'
  ),

  -- Truck 12: Delayed trip, due in 2 days
  (
    'd0000000-0000-0000-0000-000000000112'::uuid,
    'd0000000-0000-0000-0000-000000000001'::uuid,
    'DEMO-2026-0012',
    current_date - interval '2 days',
    current_date + interval '2 days',
    'Heavy Machinery Parts',
    'Mahendra Kale',
    'MH 05 LM 3344',
    'EISU8810294',
    'SL-33448',
    'd0000000-0000-0000-0000-000000000015'::uuid,
    'Mahindra Auto Feeder',
    'Kalyan Yard',
    'Thane',
    'Nashik',
    'Thane -> Shahapur -> Kasara -> Nashik',
    'Hydraulic rams & seals, 13 t',
    26500,
    26500,
    'Pending',
    'Unpaid',
    'Ghat section climbing slowly behind slow container convoy.'
  )
on conflict (id) do update set
  bill_number = excluded.bill_number,
  bill_date = excluded.bill_date,
  due_date = excluded.due_date,
  driver_name = excluded.driver_name,
  vehicle_number = excluded.vehicle_number,
  from_location = excluded.from_location,
  to_location = excluded.to_location,
  total_freight = excluded.total_freight,
  bill_status = excluded.bill_status,
  payment_status = excluded.payment_status,
  additional_notes = excluded.additional_notes;
