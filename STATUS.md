# TowGrade — Project Status

**Snapshot:** April 28, 2026 (end of session)

## Coordinates

| | |
|---|---|
| **Live URL** | https://www.towgrade.com |
| **GitHub repo** | https://github.com/chrispeer69/towgrade (private) |
| **Supabase project ID** | `aayitixttvijwdjirwea` (region: `us-east-2`) |
| **Vercel project** | `towgrade` |
| **Last code commit** | `c5eff14` — *Add operator registration with email verification, auth_user_id linkage, and service-role grants* |
| **Branch** | `main` |

## Database — migrations applied

All five migrations live in `supabase/migrations/` and tracked by the Supabase CLI as applied to the remote project:

| | File | Purpose |
|---|---|---|
| 0001 | `0001_init.sql` | 7 tables (admins, operators, providers, reviews, oem_subscribers, report_downloads, admin_actions), indexes, triggers, 11 seeded providers |
| 0002 | `0002_rls.sql` | RLS enabled on all 7 tables, business-rule triggers (quarter-close lock, append-only audit, counts_in_aggregate computed column), `public_providers` + `public_reviews` views |
| 0003 | `0003_public_view_grants.sql` | Anon/authenticated grants on `providers` + `reviews` so the security_invoker public views actually return rows; `reviews_public_aggregate_read` policy |
| 0004 | `0004_auth_link.sql` | `operators.auth_user_id` FK to `auth.users` (unique, ON DELETE CASCADE), `password_hash` made nullable, `operators_self_read` policy |
| 0005 | `0005_service_role_grants.sql` | Backfilled `service_role` grants on all public objects (the project's tables didn't pick them up automatically); ALTER DEFAULT PRIVILEGES so future tables auto-grant |

Future migrations: `npx supabase db push` (CLI is linked to the remote project).

## What's working

- **Landing page** (`/`) — full port of `prototypes/towgrade.html`: hero with dark live-panel, 4-card features grid, **live provider chips pulled from `public_providers`** (alphabetical, placeholder `—` scores), OEM strip with sample report card, sticky topbar (TowGrade wordmark + Public Scoreboard link), minimal footer.
- **Scoreboard** (`/scoreboard`) — 11 provider cards rendered server-side from `public_providers` via the anon key + `providers_public_read` RLS policy. Empty-state ("No reviews yet") on each card until aggregates exist.
- **Auth callback** (`/auth/callback`) — PKCE code exchange route handler. On error, redirects to `/register?error=...` so failures surface in the form.
- **Auth-gated dashboard** (`/dashboard`) — Server Component, redirects to `/` if no session, otherwise queries the operator's own row (via `operators_self_read` policy) and renders welcome + verification status badge + "coming soon" placeholder.
- **Register flow build** (`/register`) — Server Component + Client form (`useActionState`) + Server Action. Validation, 51-state dropdown, schema-aligned fleet sizes, ≥8-char password (also enforced server-side via Supabase auth config). signUp via SSR client (PKCE-correct), operator INSERT via service-role admin client, auth-user rollback on insert failure.
- **CI/CD** — GitHub → Vercel auto-deploy on push to `main`. Last deploy verified: `/register`, `/dashboard`, `/auth/callback` all return correct HTTP status codes on prod.

**The registration form is live in production but has not been end-to-end tested with a real signup** because Supabase's free-tier email rate limit was hit during testing.

## Tomorrow's first task

**Wire Resend for transactional email delivery.**

Path:
1. Create Resend account, verify the towgrade.com sending domain (DKIM, SPF, DMARC records on whichever DNS host).
2. Generate a Resend API key.
3. In Supabase Dashboard → Auth → SMTP Settings: configure custom SMTP using Resend's SMTP relay (host: `smtp.resend.com`, port `587`, username: `resend`, password: the API key, sender: a verified address like `noreply@towgrade.com`).
4. Customize the confirmation email template (Auth → Email Templates → "Confirm signup") so it reads as TowGrade rather than the Supabase default.
5. Re-test the full signup flow on prod: register → email lands within seconds → click link → land on `/dashboard` with welcome + pending verification badge.
6. Once email confirmation is observed working, query the DB to confirm `auth.users.email_confirmed_at` is set and the operators row is correctly linked.

Required Vercel env vars (already documented but verify before testing):
- `NEXT_PUBLIC_SUPABASE_URL` ✓ (verified set; landing page wouldn't work otherwise)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` ✓ (same)
- `SUPABASE_SERVICE_ROLE_KEY` (Production only) — needs verification
- `NEXT_PUBLIC_SITE_URL` = `https://www.towgrade.com` (Production) — needs verification

## Next major features (after registration is fully tested)

1. **Login page** — email + password sign-in, magic-link option. Mirror the register form's editorial design.
2. **Dashboard expansion** — pull KPIs (reviews submitted, public contributions, avg score), nav rail like the prototype's operator app, "My Reviews" list.
3. **Review submission** — the 12-category, 5-tab rating UI from the prototype, persisting to the `reviews` table with the `is_public` toggle and `counts_in_aggregate` derivation already wired up at the DB layer.
4. **Aggregate scoreboard** — replace placeholder `—` chips with real rolled-up scores once any reviews land. Nightly cron in Supabase Edge Functions (or scheduled GitHub Action) to recompute.
5. **Admin verification queue** — manual operator vetting before reviews count toward public aggregates (`verification_status` flips from `pending` → `verified`).

## Known issues / open items

- **Supabase free-tier email rate limit** — hit during signup testing tonight. Free tier allows 3-4 confirmation emails per hour and emails route through Supabase's shared sender. **Resolution: switch to Resend tomorrow** (per "Tomorrow's first task" above). Alternatively, upgrade the Supabase project to Pro (~$25/mo) which raises the limits and lets you set a custom SMTP sender — but Resend is cheaper at this scale and gives better deliverability.
- **No login page yet** — once a user verifies their email, they have a session for that browser, but if cookies clear they currently can't get back in. Login is the next-build task.
- **PKCE same-browser requirement** — the email confirmation link must be clicked in the same browser/device where signup was initiated (PKCE code verifier lives in cookies). Users who click from a different device will hit `"PKCE code verifier not found in storage"` and the form will show that error. Acceptable tradeoff for the security gain; revisit if user reports become common.
- **Email confirmation `redirect_to` allowlist must be exact** — Supabase's URI allowlist matches strictly, so we deliberately omit any query string from `emailRedirectTo` (the `/auth/callback` handler defaults `next` to `/dashboard`). Adding query-string variants would require either wildcard allowlist entries or pre-allowlisting each variant.
- **`NEXT_PUBLIC_SITE_URL` on Vercel** — added to `.env.example` and `.env.local` tonight but not yet verified set in Vercel's environment-variable UI. If missing, signup emails will route to `localhost:3000`.
- **No tests** — no automated test suite. Smoke tests so far have been ad-hoc curl probes. Will need vitest + playwright once the surface area grows.
- **Migration runner footnote** — 0001 + 0002 were applied via a one-shot Node + node-pg script before the Supabase CLI was wired up; their migration-history tracking entries were repaired with `supabase migration repair --status applied 0001 0002`. Visible in CLI as applied; nothing to redo.
