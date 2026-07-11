# Transport Management System — Web App

A multi-tenant Next.js + Supabase rebuild of the Pandurang Container Movers
desktop app. Every company that signs up gets its own private workspace —
bills, customers and users are fully isolated per company via database
row-level security (RLS), not just app logic.

## What's included

- **Auth**: Email/password sign up & login (Supabase Auth). Signing up creates
  a brand-new company (tenant) and makes you its first Admin.
- **Dashboard**: stat cards + monthly revenue chart + bill status pie chart.
- **New Bill / All Bills / Edit / View**: full bill form matching the
  original app's fields, auto bill numbering (`PREFIX-YYYY-0001`), and
  auto-computed Total Freight.
- **Search**: search bills by driver, bill number, vehicle, container, route.
- **Customers**: add / edit / delete, and auto-fill a bill's client details
  from a saved customer.
- **Reminders**: unpaid bills older than 7 days, with a "Copy Reminder
  Message" button.
- **GST Report**: monthly report with 5% RCM GST calculation, PDF export.
- **User Management** (admin only): add/delete staff & admin accounts under
  your company. Can't delete yourself or the last admin.
- **Company Settings** (admin only): company profile + logo upload.
- **PDF export & WhatsApp share** on the bill detail page.
- **Dark/Light theme toggle.**
- **Sarthiwala AI** — the embedded chat + voice assistant, ported from the
  desktop app's `voice_agent.py` / `voice_panel.py`. Lets any user ask about
  bills, payments and customers, or (after explicit "yes" confirmation)
  create a bill, update a bill's status/payment, delete a bill, or add a
  customer. Supports Anthropic Claude or any OpenAI-compatible endpoint,
  configured per company under **Company Settings → Sarthiwala AI**. Voice
  input/output uses the browser's built-in Speech Recognition and Speech
  Synthesis (Chrome/Edge) — no server-side audio processing needed.
- **Professional, per-company branded invoice PDF** — matches a real
  printed invoice: logo, tagline, address/GST/bank details, "To" block,
  route/container/seal details, an itemized charges table, total in words,
  and signature lines. The table heading color is customizable per company
  (Company Settings → Invoice PDF Appearance) so each tenant can use their
  own brand color. A lighter "Simple Bill" PDF is also available for a
  quick one-tap share.
- **Branded GST Report PDF** — Bill No / Date / Client GST / Amount / GST
  Type / Total GST / CGST (2.5%) / SGST (2.5%), with the same customizable
  header color and running totals footer.
- **Mobile-responsive UI** — on small screens the sidebar collapses behind a
  hamburger (☰) button in a fixed top bar; tapping it slides in the full
  navigation menu (with feature names, not just icons) over a dimmed
  backdrop. On tablet/desktop widths the sidebar is always visible, as
  before. All tables scroll horizontally on narrow screens instead of
  breaking the layout.
- Subtle depth/shadow styling throughout (cards, buttons, stat tiles) for a
  more polished, modern look.

**Not included** (out of scope for this build — flag if you want this added):
the desktop app's **Route AI** screen (the scikit-learn freight/route
predictor with live distance & weather lookups). That's a distinct ML
feature that needs its own training data and API integrations — happy to
scope it separately once the core system + Sarthiwala AI are live.

## Setting up Sarthiwala AI

1. Run `supabase/002_sarthiwala_ai.sql` and `supabase/003_invoice_branding.sql`
   in the Supabase SQL editor (both are already included in
   `supabase/schema.sql` for fresh installs — these files are only needed if
   you ran the original `schema.sql` before these features existed).
2. Log in as an admin → **Company Settings** → scroll to **✨ Sarthiwala AI**
   → choose a provider, paste an API key, pick a model → **Save & Connect**.
   - Anthropic: get a key at console.anthropic.com.
   - Custom: any OpenAI-compatible `/chat/completions` endpoint + its API key.
3. Open **Sarthiwala AI** from the sidebar (any user can use it once
   configured) and ask something like "show pending bills" or "add a new
   bill for driver Ramesh, vehicle MH12AB1234, route Pune to Mumbai, amount
   15000".
4. Write actions (create/update/delete) always ask "Shall I go ahead?"
   before touching the database — say "yes" to confirm or "no" to cancel.

## 1. Create your Supabase project

1. Go to supabase.com → New Project.
2. Open **SQL Editor** → paste the contents of `supabase/schema.sql` → Run.
   This creates every table, the multi-tenant RLS policies, the bill-numbering
   function, the signup function, and a public `logos` storage bucket.
3. In **Project Settings → API**, copy:
   - `Project URL`
   - `anon public` key
   - `service_role` key (keep this secret — server-only)
4. In **Authentication → Settings**, decide whether you want email
   confirmations on or off. For an internal business tool, most teams turn
   **"Confirm email" OFF** so new sign-ups can log in immediately.

## 2. Configure environment variables

Copy `.env.local.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR-ANON-KEY
SUPABASE_SERVICE_ROLE_KEY=YOUR-SERVICE-ROLE-KEY
```

The service role key is only ever used inside `app/api/users/route.ts`
(server-side) to create/delete staff logins — it is never sent to the
browser.

## 3. Run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` → you'll land on `/login`. Click
**"Create an account"** to sign up your first company.

## 4. Deploy to Vercel (production)

1. Push this project to a GitHub repo.
2. In Vercel: **New Project** → import the repo.
3. Add the same three environment variables from `.env.local` in
   **Project Settings → Environment Variables** (all three, for Production
   *and* Preview).
4. Deploy. Vercel will run `next build` automatically.
5. In Supabase → **Authentication → URL Configuration**, add your production
   URL (e.g. `https://your-app.vercel.app`) to **Site URL** and
   **Redirect URLs** so auth emails/links work correctly.

## Multi-tenancy model

- `companies` — one row per business/tenant.
- `profiles` — one row per login, linking a Supabase Auth user to exactly one
  `company_id` and a `role` (`admin` or `staff`).
- `customers` and `bills` both carry `company_id`, and **every table has RLS
  enabled** so Postgres itself blocks cross-company reads/writes — even if
  there's a bug in the frontend, a user can never see another company's data.
- New tenants are created via `create_company_and_admin()`, called right
  after `supabase.auth.signUp()` on the Sign Up page.
- Additional users for an existing company are created via
  `POST /api/users` (server-side, admin-only), which uses the Supabase
  service role to create the auth login and attaches it to the admin's
  `company_id`.

## Notes on going further

- **Row-level security is your safety net for production** — do not disable
  it. If you add new tables later, always add a `company_id` column and a
  matching RLS policy like the ones in `supabase/schema.sql`.
- Consider enabling Supabase's **point-in-time recovery / daily backups**
  before you rely on this in production.
- The GST calculation (RCM, 5%) mirrors what was shown in the original app's
  screenshots — double check this matches your actual tax treatment before
  relying on it for filing.
