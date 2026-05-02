# TowGrade — Project Status

**Snapshot:** May 2, 2026 (end of day)

## Coordinates

| | |
|---|---|
| **Live URL** | https://www.towgrade.com |
| **GitHub repo** | https://github.com/chrispeer69/towgrade (private) |
| **Supabase project ID** | `aayitixttvijwdjirwea` (region: `us-east-2`) |
| **Vercel project** | `towgrade` |
| **Last code commit** | `ed0e772` — *fix(phase-6-5): send admin notifications from noreply@send.towgrade.com (domain ownership workaround)* |
| **Branch** | `main` |

## Database — migrations applied

All twelve migrations live in `supabase/migrations/` and tracked by the Supabase CLI as applied to the remote project. `supabase migration list` shows Local and Remote in sync.

| | File | Purpose |
|---|---|---|
| 0001 | `0001_init.sql` | 7 tables (admins, operators, providers, reviews, oem_subscribers, report_downloads, admin_actions), indexes, triggers, 11 seeded providers |
| 0002 | `0002_rls.sql` | RLS enabled on all 7 tables, business-rule triggers (quarter-close lock, append-only audit, counts_in_aggregate computed column), `public_providers` + `public_reviews` views |
| 0003 | `0003_public_view_grants.sql` | Anon/authenticated grants on `providers` + `reviews` so the security_invoker public views actually return rows; `reviews_public_aggregate_read` policy |
| 0004 | `0004_auth_link.sql` | `operators.auth_user_id` FK to `auth.users` (unique, ON DELETE CASCADE), `password_hash` made nullable, `operators_self_read` policy |
| 0005 | `0005_service_role_grants.sql` | Backfilled `service_role` grants on all public objects (the project's tables didn't pick them up automatically); ALTER DEFAULT PRIVILEGES so future tables auto-grant |
| 0006 | `0006_operators_self_grant.sql` | `GRANT SELECT ON operators TO authenticated` so the `operators_self_read` RLS policy from 0004 can actually evaluate (policy existed but had no underlying privilege to gate) |
| 0007 | `0007_public_providers_aggregate.sql` | `public_providers` view extended with live aggregate columns (review count, overall_score average, would_recommend percentage). Computed at query time. Five-review threshold for score visibility. |
| 0008 | `0008_admin_verification_queue.sql` | `admins.auth_user_id` FK to `auth.users`, `password_hash` made nullable, first admin (Chris) seeded by email lookup, propagation trigger on `operators` verification_status changes (recomputes `counts_in_aggregate` on all the operator's reviews); tx-local GUC bypass for the quarter-close lock so closed-quarter reviews can be recomputed by system propagation. |
| 0009 | `0009_admin_self_read.sql` | `admins_self_read` RLS policy and `GRANT SELECT ON admins TO authenticated`. Same bug class 0006 fixed for operators. |
| 0010 | `0010_reviews_self_read.sql` | `reviews_self_read` RLS policy so an authenticated operator can read every review they submitted regardless of `is_public` / `counts_in_aggregate` / their own verification_status. Complements (does not replace) `reviews_public_aggregate_read` from 0003 — Postgres OR's RLS policies. Required for the My Reviews list to show private and pending-verification reviews. |
| 0011 | `0011_operators_self_update.sql` | Column-level `GRANT UPDATE (first_name, last_name, company_name, state, fleet_size) ON operators TO authenticated` plus matching `operators_self_update` RLS policy (USING + WITH CHECK on `auth_user_id = auth.uid()`). Column-level privilege is the load-bearing protection — Postgres rejects any UPDATE whose SET list touches a column the role lacks privilege on, before RLS runs, so `email` / `verification_status` / `verified_*` / `auth_user_id` are structurally unreachable from the app role. |
| 0012 | `0012_operators_admin_notified.sql` | `operators.admin_notified_at timestamptz` column for atomic dedup of the per-registration admin notification email (Phase 6.5). Set in a single UPDATE with `IS NULL` guard inside `notifyAdminsNewOperator`; concurrent or repeat callers see the column already set and exit silently. No index — column is read/written per-operator by primary key only. |

Future migrations: `npx supabase db push` (CLI is linked to the remote project).

## What's working

- **Landing page** (`/`) — full port of `prototypes/towgrade.html`: hero with dark live-panel, 4-card features grid, **live provider chips pulled from `public_providers`** (alphabetical; score badges per Phase 3 below), OEM strip with sample report card, sticky topbar (TowGrade wordmark + Public Scoreboard + Sign In links), minimal footer.
- **Scoreboard** (`/scoreboard`) — 11 provider cards rendered server-side from `public_providers` via the anon key + `providers_public_read` RLS policy. (Card render states extended in Phase 3 below.)
- **Auth callback** (`/auth/callback`) — PKCE code exchange route handler. On error, redirects to `/register?error=...` so failures surface in the form. On first successful confirmation for a pending operator, schedules a fire-and-forget admin notification via `after()` from `next/server` (Phase 6.5).
- **Register flow** (`/register`) — Server Component + Client form (`useActionState`) + Server Action. Validation, 51-state dropdown, schema-aligned fleet sizes, ≥8-char password (also enforced server-side via Supabase auth config). signUp via SSR client (PKCE-correct), operator INSERT via service-role admin client, auth-user rollback on insert failure.
- **Login page** (`/login`) — email + password sign-in with friendly error mapping (invalid credentials, unconfirmed email, etc.). Authenticated users hitting `/login` redirect to `/dashboard`. Mirrors the editorial design of `/register`.
- **Branded transactional email — operator confirmation** — Resend SMTP integrated via Supabase Auth custom SMTP (host `smtp.resend.com`, port `465`, sender `noreply@towgrade.com`). Branded HTML template configured for the "Confirm signup" email; password-reset / magic-link templates still use Supabase defaults.
- **End-to-end signup verified in production** — register → branded confirmation email → click link → `/auth/callback` → `/dashboard` with active session and operator row loaded. `auth.users.email_confirmed_at` and `operators.auth_user_id` correctly populated.
- **Auth-gated dashboard** (`/dashboard`) — Server Component layout with shared **nav rail** (Overview / Rate a Provider / My Reviews / Account), verification status badge in the header, **sign-out server action** that redirects to `/`. Redirects unauthenticated requests to `/`.
- **Header behavior** — `Sign In` link added to the top nav via the `HeaderLinks` client component; the link is hidden on `/dashboard` routes so signed-in users don't see a redundant entry point.
- **Shared operator fetch** — `getOperator()` helper at `src/lib/operator.ts` so every dashboard page reads the operator row through one verified path (uses the SSR client + the `operators_self_read` policy).
- **Phase 1 — Rate a Provider review submission UI** (`/dashboard/rate`, `/dashboard/rate/[slug]`) — picker grid with 11 cards; per-card "Rate" / "Edit your review" CTA based on whether the operator already submitted a review for the current quarter. Form is single-page with 5 tabs (Compensation / Operations / Support / Technology / Final Assessment), 14 scored categories, 10-star UI in dark goldenrod (`#B8860B`), live `overall_score` shown in a sticky header. Per-category narratives are collapsible and always private. Final Assessment tab carries `would_recommend` Yes/No, an optional summary narrative, and the `is_public` toggle. localStorage drafts scoped to `(provider_id, period)`; hydration precedence is existing-review > draft > empty. Submit gated on all 14 scores + a recommendation. Service-role Server Action validates server-side and INSERTs or UPDATEs based on the existing-review lookup; `counts_in_aggregate` is left to the existing DB trigger.
- **Phase 3 — Live aggregate rollup on the public scoreboard** — `public_providers` view extended in 0007 with `aggregate_review_count`, `aggregate_overall_score`, `aggregate_recommend_pct` (last two NULL until count ≥ 5). `/scoreboard` cards render one of three states: count ≥ 5 shows large Playfair score + recommend percentage + verified-review count; 1–4 shows a progress headline ("N reviews so far. Public scoring activates at 5."); 0 shows "Awaiting first review." Landing-page chips show the mono score next to the provider name once a provider clears the threshold; otherwise plain `—`. Computed live in Postgres at query time — no aggregate table, no materialized view, no cron.
- **Phase 4 — Admin verification queue** (`/admin`) — top-level route gated by `getAdmin()` (`src/lib/admin.ts`), which mirrors the operator-fetch pattern. Lists `verification_status='pending'` operators oldest-first as a single editorial table with one-click Approve / Deny actions. Approve sets `verification_status='verified'`, `verified_at=now()`, `verified_by=<admin.id>`. Deny sets `verification_status='rejected'`, `verified_at=null`. Both actions write an audit row to `admin_actions` (`operator.verify` / `operator.reject`). Trigger `trg_operators_verification_propagate` from 0008 fires on status changes and touches every review the operator owns, so the existing per-row `set_counts_in_aggregate` BEFORE trigger recomputes `counts_in_aggregate` retroactively. Sign-out reuses the existing dashboard server action.
- **Phase 5 — My Reviews list view** (`/dashboard/reviews`) — operators see their submitted reviews with provider name, period, overall score, would-recommend answer, public/private status, and counts-in-aggregate status. Edit affordance routes back to `/dashboard/rate/[slug]` (the rate-a-provider form already detects existing reviews and supports update). Reads via the new `reviews_self_read` policy in 0010, so private and pending-verification reviews are visible to their author even though they're hidden from the public aggregate.
- **Phase 6 — Account profile editing** (`/dashboard/account`) — operators edit first/last name, company name, state, fleet size, and change password via Supabase Auth. Profile UPDATE is gated by column-level GRANT + RLS in 0011 — the app role can only SET the five editable columns, and Postgres rejects any UPDATE whose SET list touches a privileged column (`email`, `verification_status`, `verified_*`, `auth_user_id`) before RLS even runs. Defense in depth.
- **Phase 6.5 — Per-registration admin notification email** — when a newly-registered operator confirms their email and lands on `/dashboard` for the first time, every active admin in the `admins` table receives a branded HTML email via Resend with the operator's name, company, state, fleet size, email, registered timestamp, and a CTA to `/admin`. Sent directly from the app via the Resend SDK (separate `RESEND_API_KEY` from the Supabase Auth SMTP credential, so it can be rotated independently). Trigger point is `/auth/callback` after a successful PKCE exchange when `verification_status='pending'` and `admin_notified_at IS NULL`. Atomic claim on `admin_notified_at` (NULL → `now()`) inside `notifyAdminsNewOperator` prevents duplicate emails on repeat confirmation clicks or concurrent callers. Fire-and-forget via `after()` from `next/server` so the operator's redirect to `/dashboard` is never blocked by the email send. Send failures are logged to `console.error` and swallowed; the dedup claim is not rolled back on failure (preventing duplicate spam wins over preserving a retry opportunity). Verified in production May 2, 2026. Sends from `noreply@send.towgrade.com` (subdomain workaround — see Known issues for the towgrade.com Resend ownership conflict).
- **CI/CD** — GitHub → Vercel auto-deploy on push to `main`. Branch previews used for most UI work, but auth-flow features are merged-and-tested in production due to the `NEXT_PUBLIC_SITE_URL` constraint described under Known issues.

## Tomorrow's first task

Phase 6.5 verified end of day May 2. Next: **Phase 6.6 (admin management UI)** or **mobile responsiveness audit** — Chris will decide.

## Pre-market backlog (must ship before paid customer access)

- **Phase 6.6 — Admin management UI** — admin-add-admin, admin-remove-admin, admin audit log view. The first admin is seeded via SQL in 0008; that bootstrapping shortcut needs a proper UI before market launch.
- **Forgot-password and magic-link sign-in** — both with branded Resend templates to match the confirmation email.
- **Mobile responsiveness audit** — dashboard nav rail, rate-a-provider form, scoreboard cards, admin queue table on small screens.
- **Live-wire the marketing hero panel** — currently shows hardcoded illustrative scores ("NSD 7.8 / AAA 7.1 / …"). Wire to `public_providers` aggregates the same way the chip strip is wired.
- **Per-environment `NEXT_PUBLIC_SITE_URL` in Vercel** — so preview deployments can run the email-confirmation flow against their own preview origin instead of always redirecting back to production. See Known issues.
- **Unify Resend sender domain.** Once `towgrade.com` is released by the NZ contractor's Resend account and added to ours, switch the Phase 6.5 sender from `noreply@send.towgrade.com` back to `noreply@towgrade.com` so all transactional email comes from a single apex sender.

## Post-beta product surfaces (paid)

These build after closed beta proves the data flywheel works. Gated to OEM and insurer roles. The actual deliverable that procurement officers buy.

- **Comparison Reports panel** — full-table provider comparison with deltas, gated to OEM/insurer roles.
- **OEM Intelligence panel** — quarterly Network Intelligence Report with numbered findings.

## Known issues / open items

- **Resend domain ownership conflict on `towgrade.com`.** `towgrade.com` is registered in another Resend account (likely the NZ contractor's account from the abandoned earlier build). Cannot be claimed without that account's owner releasing it. Workaround: `send.towgrade.com` is verified in our Resend account and used as the sender for Phase 6.5 admin notifications. Operator confirmation emails (via Supabase Auth SMTP) still send from `noreply@towgrade.com` because SMTP doesn't validate from-domain against the account's verified domains the way the SDK does — left unchanged to avoid breaking working flow. Real fix: contact NZ contractor to release `towgrade.com` from their Resend account, then unify both senders on the apex domain.
- **`NEXT_PUBLIC_SITE_URL` hardcodes confirmation email links to production** — the env var is set to `https://www.towgrade.com` in Vercel for all environments, so signup confirmation emails sent from a preview deploy still link the user back to production for the PKCE exchange. The cookie holding the PKCE verifier is on the preview origin, not production, so the exchange fails on the production callback. This structurally blocks preview testing of any auth-flow feature. Workaround in use today: skip preview testing for auth-flow features, merge to main, and verify in production. Real fix: per-environment `NEXT_PUBLIC_SITE_URL` configured in Vercel (Production = `https://www.towgrade.com`; Preview = the preview deployment URL via Vercel system env vars; Development = `http://localhost:3000`).
- **PKCE same-browser requirement** — the email confirmation link must be clicked in the same browser/device where signup was initiated (PKCE code verifier lives in cookies). Users who click from a different device hit `"PKCE code verifier not found in storage"` and the form surfaces that error. Acceptable tradeoff for the security gain; revisit if user reports become common.
- **Email confirmation `redirect_to` allowlist must be exact** — Supabase's URI allowlist matches strictly, so we deliberately omit any query string from `emailRedirectTo` (the `/auth/callback` handler defaults `next` to `/dashboard`). Adding query-string variants would require either wildcard allowlist entries or pre-allowlisting each variant.
- **No tests** — no automated test suite. Smoke tests so far have been ad-hoc curl probes plus manual end-to-end flows. Will need vitest + playwright once the surface area grows.
- **Branded templates only for "Confirm signup"** — password-reset and magic-link emails still use Supabase defaults. Match the branded template before exposing those flows to users.

## Notes

- **Test operators denied during Phase 4 testing** — `chris+test1@bluecollarai.online` through `+test4` and a couple others sit at `verification_status='rejected'`. They can be flipped back to `verified` later via the queue (re-approving an already-decided operator works) if needed for testing.
- **Chris is verified and is the only admin.** Reviews of AAA and Agero from `chris@bluecollarai.online` count in the public aggregate (count = 1 each, below the 5-review threshold so the scoreboard renders the "1 review so far. Public scoring activates at 5." state for both).
- **Propagation trigger + quarter-close bypass GUC are now established patterns** for system-driven review state changes. Future automated trust scoring or verification flow updates can reuse the same approach.
- **Atomic-claim dedup pattern** — Phase 6.5 established the pattern for "this side-effect should fire exactly once": single UPDATE with `IS NULL` guard, `RETURNING` to determine claim success, side effect runs only if the row was claimed. Reusable for any future fire-once notification, cron-style state transition, or one-shot enrichment task.
- **Browser-Claude plugin (Claude in Chrome) is unreliable for shared-component edits** — it mangled `layout.tsx` with duplicated closing tags during the April 29 header-link task. Use it only for isolated new-file work where the blast radius is small. Claude Code is the default for any work touching `layout.tsx`, the dashboard layout, `globals.css`, or other shared files.
- **Migration drift recovery pattern** — when SQL is applied via Supabase SQL Editor (not via `supabase db push`), the CLI tracking row must be repaired with `supabase migration repair --status applied <version>`. Used April 29 for 0006.
- **Vercel env vars: value must go in the Value field, not the Note field** — the Note field is just a label and is ignored at runtime. This caused an outage on April 29 (`NEXT_PUBLIC_SITE_URL` was empty at runtime).
- **Migration runner footnote** — 0001 + 0002 were applied via a one-shot Node + node-pg script before the Supabase CLI was wired up; their migration-history tracking entries were repaired with `supabase migration repair --status applied 0001 0002`. Visible in CLI as applied; nothing to redo.
