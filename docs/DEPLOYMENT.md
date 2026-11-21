# BTA — Deployment & Operations Guide

## Hosting on Vercel (recommended free tier)

1. Push this branch / merge the PR to `main`.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import `Teedaniel5/testingg`.
3. Environment variables (Project → Settings → Environment Variables):
   - `GEMINI_API_KEY` — free Gemini key from <https://aistudio.google.com/apikey> (AI Mentor). Free alternative: `GROQ_API_KEY` from <https://console.groq.com/keys>. No card required for either free tier.
   - Vercel **Deployment Protection must be OFF**: Project → Settings → Deployment Protection → disable "Vercel Authentication" (and any password/SAML protection), so anyone can open the site without logging into Vercel.

### Broker APIs (Admin → Broker APIs)
- **Deriv**: create a free app at <https://api.deriv.com> to get an App ID (or use test app id `1089`), optionally create an API token in your Deriv account (gives account balance). Paste in Admin → Broker APIs, tick **Deriv enabled**, then press **Test Deriv connection**. Used by the AI mentor for live forex/gold prices (H1 candles) via the Deriv WebSocket API.
- **Weltrade**: Weltrade accounts are MT4/MT5 and have no public market-data REST API. If Weltrade support provides a MetaTrader WebAPI endpoint, enter its URL + MT4/MT5 login/password; otherwise keep Weltrade OFF — the AI automatically uses Deriv for live data and says so.
- Keys are stored in the server database, masked in the admin UI, and never exposed to students.
   - `DATABASE_URL` + `DATABASE_AUTH_TOKEN` — a hosted libSQL DB (see below). Do **not** skip this: the Vercel filesystem is ephemeral and a file SQLite would be reset between requests.
   - `SUPER_ADMIN_EMAIL` — the email you will register with.
4. Deploy, then open the site and **Register first** with the super admin email.

## Database options

| Option | Where | Notes |
|---|---|---|
| Local file `data/bta.db` (default) | Your PC / a VPS | Perfect for dev; runs automatically, zero config. |
| [Turso](https://turso.tech) (libSQL) | Vercel/serverless | Free tier generous. `turso db create bta` → `turso db show bta --url` → set `DATABASE_URL`; `turso db tokens create bta` → `DATABASE_AUTH_TOKEN`. |

The schema auto-migrates on first use. Backups: `turso db shell bta .dump > backup.sql` (or copy `data/bta.db` locally).

## Files (uploads)

Product files, lesson materials, chart screenshots and payment proofs are stored in `data/uploads/` — private (outside `public/`) and served only through entitlement-checked APIs.

On Vercel the filesystem is read-only/ephemeral: use a VPS (Hetzner/DigitalOcean/Vultr) for the full upload features, or attach blob storage (e.g. UploadThing, Cloudflare R2, Vercel Blob) later — the save/read points are isolated in `lib/files.ts` and the download routes, so swapping storage is one small change.

## Payments

- **Manual verification (live now)** — best for Zimbabwe right now: EcoCash, OneMoney, Innbucks, bank transfer. The customer pays, uploads proof, the admin verifies in **Admin → Orders** and access is granted. Configure instructions in **Admin → Settings**.
- **Automated gateways** — verify availability and business requirements before committing:
  - **Stripe**: not available to Zimbabwe-registered businesses without a foreign entity; works if you have a supported-country entity.
  - **Paynow Zimbabwe**: local gateway (EcoCash, Visa/Mastercard) — webhooks are signature-verified; mark orders approved only inside the verified webhook.
  - **Flutterwave / DPO**: check their supported-country and payout rules.
- Golden rule (already enforced in the app): paid access is granted **only** by admin approval or a webhook whose signature you verify server-side. Client-side success callbacks never grant access.

## Notifications

In-app notifications are live for signals, payments, replies and announcements. Easiest next steps to extend reach:
- **Email**: plug a transactional provider (e.g. Resend, Brevo) into the `notify()` helper in `lib/files.ts`.
- **Telegram/WhatsApp Business**: same helper — send to a channel/group with a bot token.
- Members' phone numbers are captured at registration for WhatsApp support.

## Security checklist (done)

- scrypt password hashing, 256-bit session tokens, HTTP-only + SameSite cookies
- role checks on every admin/community action (server-side, in server actions)
- entitlement checks on every download (orders + enrolments), path traversal guards
- upload allowlists (type + 25 MB cap), login/register/contact rate limits
- suspended accounts cannot log in; super-admin is protected from privilege edits by non-super-admins

## Routine operations

- **Verify payments daily**: Admin → Orders (staff get in-app notifications for new proofs).
- **Publish signals**: Admin → Signals → publish, then update outcome (win/loss/break-even) when the trade completes — the performance dashboard recalculates automatically.
- **Content**: Admin → Courses / Products / Resources — no code changes needed.
- **Moderate**: Admin → Community — pin, delete, suspend abusive users.

## Testing payments (do this before announcing prices)

1. Register two accounts (one admin, one as a fake student).
2. As the student: subscribe to Signals Pro → submit a fake proof.
3. As admin: open Admin → Orders → reject one, approve one — confirm the student's dashboard, signals feed and library respond correctly to both outcomes.
4. Confirm expiry: grant a 1-day admin subscription and verify access disappears after expiry.
