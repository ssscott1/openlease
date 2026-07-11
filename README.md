# OpenLease

Brand-new cars for professionals on temporary Australian visas. The lease
matches the visa — any term from 9 to 24 months (including odd terms like 15)
— with **one all-inclusive weekly price** covering everything except fuel:
insurance, servicing, maintenance, tyres, rego & CTP, roadside, and
delivery + collection. No Australian credit history required.

Public site + interactive quoting tool + staff CRM, in five languages
(English, 简体中文, 繁體中文, العربية with full RTL, ਪੰਜਾਬੀ).

## Stack

- **Next.js 16** (App Router, TypeScript) + **Tailwind CSS v4**
- **Supabase** — Postgres with RLS, Auth, Storage (vehicle images),
  Edge Functions (transactional email via Resend)
- **next-intl** — locale routing, message catalogues in `/messages`

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL + publishable key
npm run dev
```

Apply the SQL in `supabase/migrations/` to your Supabase project in order
(via the SQL editor, `supabase db push`, or the Supabase MCP), then deploy
the edge function:

```bash
supabase functions deploy send-lead-emails
supabase secrets set RESEND_API_KEY=... EMAIL_FROM="OpenLease <quotes@yourdomain>"
```

Without `RESEND_API_KEY` the function no-ops gracefully — lead capture never
depends on email delivery.

### Staff access

Create a user in Supabase Auth, then add a row in `profiles` with role
`admin` or `sales`. Admin Login is at `/admin/login`. Customer Login in the
header redirects to the URL stored in `settings.customer_login_url`
(default `https://www.karia.com.au`) — repoint it in the CRM, no deploy.

## Architecture notes

- **Nothing is hard-coded.** Vehicles, pricing rules (term multipliers,
  380 km/week, excess rate, included items), settings and all public copy
  come from the database or `/messages/*.json`. Edit a rate in the CRM and
  the public quote changes immediately.
- **Pricing engine** (`src/lib/pricing.ts`) is shared by the site, the
  lead-capture API and the CRM. `weekly_price = round(base_weekly_rate ×
  term_multiplier(term))`, with linear interpolation between configured
  anchors (15 months between 12×1.08 and 18×1.04 → ×1.06).
- **Controlled write path.** The public site can only INSERT `leads` +
  `quotes` (never read them) through `/api/quote`, which recomputes pricing
  server-side. RLS is the enforcement layer, verified with anon-role tests.
- **Audit + timeline are automatic.** DB triggers log every mutation to
  `audit_log` and every lead status change to `activities`, so Kanban drags
  are captured even if a client forgets.
- **Compliance boundary** (spec §4.3): converting a quote to an application
  enters a gated flow with five responsible-lending/disclosure checkpoints.
  Approval is blocked until all are recorded. `TODO(compliance)` markers in
  `ApplicationDetail.tsx` document the real integrations to wire in.
- **i18n**: Arabic renders full RTL (`dir` + logical CSS properties).
  Non-English catalogues are machine-assisted **drafts** — see
  `TRANSLATIONS.md` before launch. `node scripts/check-messages.mjs`
  enforces key parity.

## CRM (`/admin`)

Pipeline Kanban with drag-and-drop + table view (sort/filter/bulk/CSV),
lead detail with full activity timeline and inline editing, quote re-send /
duplicate / convert, vehicle CRUD with image upload, live pricing editor
with price preview, settings, dashboard (new leads, conversion, weekly
revenue, source/language mix), end-of-term radar with re-lease and
collection workflows, audit log, global search (`/`), shortcuts
(`n` new lead, `g`+`d/p/r/v/s` to navigate).

## Known follow-ups

- Professional review of the four draft translation files (TRANSLATIONS.md)
- Daily digest email (settings flag exists; needs a scheduled function)
- Compliance integrations per `TODO(compliance)` markers
- Enable leaked-password protection in Supabase Auth settings
