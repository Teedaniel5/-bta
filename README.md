# Brilliant Trading Academy — Platform

A full forex education & trading technology platform: **Learn, Trade, Buy, Sell, Connect, Grow.**
Tagline: **Treasures in Hidden Places.**

Built with Next.js (App Router) + TypeScript, the official Mistral SDK (`@mistralai/mistralai`, model `mistral-small-latest`), and an SQL database via `@libsql/client` (local SQLite file by default, hosted libSQL/Turso in production).

## Features

- **Brand & design**: navy/gold premium design system using the official BTA logo, fully responsive.
- **Authentication**: email+password accounts (scrypt hashing), HTTP-only session cookies, rate-limited login/register, suspended-account blocking.
- **Roles**: Super Admin, Admin, Instructor, Signal Provider, Moderator, Member. Role-based access control on every admin action.
- **Membership levels**: Free → Student → Signals Pro → VIP Elite, computed from real subscription/purchase records.
- **Digital store**: admin-uploaded products (eBooks, indicators, EAs, strategies, templates, journals, training) with covers, categories, prices, reviews/ratings, secure downloads.
- **Checkout & payments**: manual payment verification flow — payment instructions (admin-configured), method + reference + proof upload; admin approves/rejects; access granted only after approval. Receipts & payment history in the member library.
- **Secure downloads**: `/api/download/order/[id]` verifies ownership + approval before serving; compiled indicator/EA files (EX4/EX5 etc.) are stored outside the public folder and guarded by path checks.
- **LMS**: admin-created courses with modules and lessons (video URL, PPT/PDF/MP4/MP3/ZIP uploads, lesson text), student progress tracking, completion %, printable certificate of completion.
- **Signals centre**: free/premium/VIP tiers, entry/SL/TP/R:R/timeframe/rationale/chart, active/closed/cancelled status, archive, and a performance dashboard computed only from recorded outcomes (win rate, average R:R, wins/losses/break-even/cancelled).
- **VIP Elite Club**: gated VIP signals + benefits page; members see membership expiry inside the dashboard.
- **Community forum**: public / members / student / VIP rooms, discussions with chart screenshots, replies, likes, search, moderation (delete, pin, suspend users).
- **Member dashboard**: membership level, active subscriptions with expiry, purchases, courses, community activity, notifications, payment history.
- **Notifications**: in-app notification centre; new signals, signal closures, payment approvals/rejections, replies, new resources all generate notifications.
- **Admin analytics**: registered members, active subscribers, total/monthly revenue, membership distribution, enrolments, signal counts — all computed from live database records.
- **AI Mentor (`/chat`)**: retained Mistral-powered chat, keys stay server-side.
- **SEO**: per-page titles/descriptions, Open Graph with logo, WhatsApp CTAs throughout.

## Getting started

### 1. Install

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env.local
```

- `MISTRAL_API_KEY` — from [console.mistral.ai](https://console.mistral.ai/api-keys) (used by the AI Mentor).
- `DATABASE_URL` — optional; defaults to local SQLite `data/bta.db`. For production use a hosted libSQL/Turso URL + `DATABASE_AUTH_TOKEN` (a file database on Vercel is ephemeral).
- `SUPER_ADMIN_EMAIL` — the account registered with this email becomes Super Administrator; otherwise the **first account ever registered** becomes Super Admin.

### 3. Run

```bash
npm run dev      # http://localhost:3000
npm run build && npm start   # production
```

The SQLite database file is created and migrated automatically on first run (schema + seeded community rooms, settings and the two store products).

## Project structure

```
app/
  page.tsx about/ contact/ resources/ vip/ membership/   # public site
  courses/[id]/…  store/[id]/…  signals/ community/…     # member areas
  dashboard/ library/ checkout/order/[id]/               # member dashboard
  admin/…                                                # admin suite
  chat/ + api/chat/route.ts                              # AI mentor
  actions.ts  admin/actions.ts                           # server actions (all mutations)
  api/download/…                                         # entitlement-checked downloads
lib/
  db.ts        # schema, migration, seed, queries
  auth.ts      # passwords, sessions, roles, rate limiting
  access.ts    # membership levels, entitlements, room access
  files.ts     # secure uploads, notifications, helpers
docs/DEPLOYMENT.md  # hosting, payments & operations guide
```

## Payments

The working live flow is **manual verification** (strongly suited to Zimbabwe: EcoCash, OneMoney, Innbucks, bank transfer, plus international options):

1. Customer picks a product/course/plan → an order is created (`awaiting_payment`).
2. Checkout shows admin-configured payment instructions + WhatsApp buttons.
3. Customer submits method, transaction reference and proof of payment.
4. Order moves to `verifying`; staff are notified.
5. Admin reviews the proof in **Admin → Orders** and approves or rejects.
6. On approval the correct access is granted automatically (product download, course enrolment or subscription period); the member is notified. On rejection, access is withheld.

Access is never granted on a screenshot alone — an administrator decision or a verified webhook is required. For automated gateways (e.g. Stripe for international cards, or local Zimbabwean gateways such as Paynow where your business is registered), integrate on top of the same orders table and only mark `approved` inside a **signature-verified webhook**. Check each provider's supported countries and business requirements before choosing.

## Security notes

- Passwords: scrypt + per-user salt. Sessions: random 256-bit tokens, HTTP-only cookies.
- All admin/community mutations check roles server-side; free-tier users can never fetch premium signal fields or paid downloads.
- Uploads: extension + size allowlists; product/lesson files served only via entitlement-checked routes; images served publicly only for covers/charts/proofs shown to their owners.
- Login/register/contact endpoints are rate-limited.

## Disclaimer

Trading foreign exchange carries a high level of risk. All performance figures come from recorded signal outcomes; nothing on the site promises profits. This platform provides education, not financial advice.
