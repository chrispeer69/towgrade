# TowGrade — Project Status

**Snapshot:** April 29, 2026 (end of session)

## Coordinates

| | |
|---|---|
| **Live URL** | https://www.towgrade.com |
| **GitHub repo** | https://github.com/chrispeer69/towgrade (private) |
| **Supabase project ID** | `aayitixttvijwdjirwea` (region: `us-east-2`) |
| **Vercel project** | `towgrade` |
| **Last code commit** | `e6504db` — *feat(dashboard): add nav rail skeleton with stub sections* |
| **Branch** | `main` |

## Database — migrations applied

All six migrations live in `supabase/migrations/` and tracked by the Supabase CLI as applied to the remote project. `supabase migration list` shows Local and Remote in sync.

| | File | Purpose |
|---|---|---|
| 0001 | `0001_init.sql` | 7 tables (admins, operators, providers, reviews, oem_subscribers, report_downloads, admin_actions), indexes, triggers, 11 seeded providers |
| 0002 | `0002_rls.sql` | RLS enabled on all 7 tables, business-rule triggers (quarter-close lock, append-only audit, counts_in_aggregate computed column), `public_providers` + `public_reviews` views |
| 0003 | `0003_public_view_grants.sql` | Anon/authenticated grants on `providers` + `reviews` so the security_invoker public views actually return rows; `reviews_public_aggregate_read` policy |
| 0004 | `0004_auth_link.sql` | `operators.auth_user_id` FK to `auth.users` (unique, ON DELETE CASCADE), `password_hash` made nullable, `operators_self_read` policy |
| 0005 | `0005_service_role_grants.sql` | Backfilled `service_role` grants on all public objects (the project's tables didn't pick them up automatically); ALTER DEFAULT PRIVILEGES so future tables auto-grant |
| 0006 | `0006_operators_self_grant.sql` | `GRANT SELECT ON operators TO authenticated` so the `operators_self_read` RLS policy from 0004 can actually evaluate (policy existed but had no underlying privilege to gate) |

Future migrations: `npx supabase db push` (CLI is linked to the remote project).

## What's working

- **Landing page** (`/`) — full port of `prototypes/towgrade.html`: hero with dark live-panel, 4-card features grid, **live provider chips pulled from `public_providers`** (alphabetical, placeholder `—` scores), OEM strip with sample report card, sticky topbar (TowGrade wordmark + Public Scoreboard + Sign In links), minimal footer.
- **Scoreboard** (`/scoreboard`) — 11 provider cards rendered server-side from `public_providers` via the anon key + `providers_public_read` RLS policy. Empty-state ("No reviews yet") on each card until aggregates exist.
- **Auth callback** (`/auth/callback`) — PKCE code exchange route handler. On error, redirects to `/register?error=...` so failures surface in the form.
- **Register flow** (`/register`) — Server Component + Client form (`useActionState`) + Server Action. Validation, 51-state dropdown, schema-aligned fleet sizes, ≥8-char password (also enforced server-side via Supabase auth config). signUp via SSR client (PKCE-correct), operator INSERT via service-role admin client, auth-user rollback on insert failure.
- **Login page** (`/login`) — email + password sign-in with friendly error mapping (invalid credentials, unconfirmed email, etc.). Authenticated users hitting `/login` redirect to `/dashboard`. Mirrors the editorial design of `/register`.
- **Branded transactional email** — Resend SMTP integrated via Supabase Auth custom SMTP (host `smtp.resend.com`, port `465`, sender `noreply@towgrade.com`). Branded HTML template configured for the "Confirm signup" email; password-reset / magic-link templates still use Supabase defaults.
- **End-to-end signup verified in production** — register → branded confirmation email → click link → `/auth/callback` → `/dashboard` with active session and operator row loaded. `auth.users.email_confirmed_at` and `operators.auth_user_id` correctly populated.
- **Auth-gated dashboard** (`/dashboard`) — Server Component layout with shared **nav rail** (Overview / Rate a Provider / My Reviews / Account), per-section sub-routes (stub pages), verification status badge in the header, **sign-out server action** that redirects to `/`. Redirects unauthenticated requests to `/`.
- **Header behavior** — `Sign In` link added to the top nav via the `HeaderLinks` client component; the link is hidden on `/dashboard` routes so signed-in users don't see a redundant entry point.
- **Shared operator fetch** — `getOperator()` helper at `src/lib/operator.ts` so every dashboard page reads the operator row through one verified path (uses the SSR client + the `operators_self_read` policy).
- **CI/CD** — GitHub → Vercel auto-deploy on push to `main`. Branch previews used for all UI work today.

## Bugs fixed today

- **`NEXT_PUBLIC_SITE_URL` was effectively empty in Vercel** — value had been typed into the *Note* field instead of the *Value* field, so `emailRedirectTo` fell back to defaults and confirmation links pointed at the wrong host. Fixed by entering the URL in the Value field and forcing a rebuild. Diagnostic logging added then removed (`d099218` → `52d999b`).
- **`operators` table missing `GRANT SELECT TO authenticated`** — the `operators_self_read` RLS policy from 0004 existed but had no underlying privilege to evaluate, so authenticated users hit empty result sets on the dashboard. Fixed by `0006_operators_self_grant.sql`, applied via the Supabase SQL Editor; CLI tracking repaired with `supabase migration repair --status applied 0006`.
- **One production outage (~minutes)** — the browser-Claude plugin pushed mangled JSX (duplicate closing tags) directly to `main` on the first header-link attempt, breaking the build. Reverted both bad commits cleanly via `git revert` (`d500388`, `42f595a`). Header work re-done correctly through Code on a branch (`98265cf`). Going forward, all shared-component work goes through Code on a branch and previews on Vercel before merge.

## Tomorrow's first task

**Build the Rate a Provider review submission UI.**

This is the core operator action that produces the data the entire business model depends on. Scope:

- 5-tab structure per `CLAUDE.md` §3 (Compensation / Operations / Support / Technology / Final Assessment)
- 12 categories with the 10-star UI from `prototypes/towgrade.html` (dark goldenrod `#B8860B`)
- Per-category narrative text fields (always private)
- Per-review **privacy toggle** controlling `is_public` (numeric scores in/out of the public aggregate; narratives never public regardless)
- Provider picker (11 seeded providers, letter-mark avatars per design system)
- Period selector (current quarter)
- Persists to `reviews` with `category_scores` JSONB and `narratives` JSONB; `counts_in_aggregate` is computed at the DB layer

Decisions to make before building: single-page-with-tabs vs. multi-step wizard; draft/save behavior; single review per operator/provider/period rate-limit UX.

## Next major features (after Rate a Provider)

1. **My Reviews list view** — table of submitted reviews with public/private status, per-category score summary, edit affordance (within the same period).
2. **Account profile editing** — name, company name, state, fleet size, password change.
3. **Aggregate scoreboard rollup** — replace placeholder `—` chips with real rolled-up scores once any reviews land. Nightly cron in Supabase Edge Functions (or scheduled GitHub Action).
4. **Admin verification queue** — manual operator vetting before reviews count toward public aggregates (`verification_status` flips from `pending` → `verified`).
5. **Forgot-password + magic-link sign-in** — both with branded Resend templates to match the confirmation email.
6. **Comparison Reports panel** (`CLAUDE.md` §2) — full-table provider comparison with deltas.
7. **OEM Intelligence panel** (`CLAUDE.md` §2) — quarterly Network Intelligence Report with numbered findings; gated to OEM/insurer roles.
8. **Mobile responsiveness audit** — dashboard nav rail and review form on small screens.

## Known issues / open items

- **PKCE same-browser requirement** — the email confirmation link must be clicked in the same browser/device where signup was initiated (PKCE code verifier lives in cookies). Users who click from a different device hit `"PKCE code verifier not found in storage"` and the form surfaces that error. Acceptable tradeoff for the security gain; revisit if user reports become common.
- **Email confirmation `redirect_to` allowlist must be exact** — Supabase's URI allowlist matches strictly, so we deliberately omit any query string from `emailRedirectTo` (the `/auth/callback` handler defaults `next` to `/dashboard`). Adding query-string variants would require either wildcard allowlist entries or pre-allowlisting each variant.
- **No tests** — no automated test suite. Smoke tests so far have been ad-hoc curl probes plus manual end-to-end signup. Will need vitest + playwright once the surface area grows.
- **Branded templates only for "Confirm signup"** — password-reset and magic-link emails still use Supabase defaults. Match the branded template before exposing those flows to users.

## Notes

- **Stale auth users from today's testing** — `chris+test1@bluecollarai.online` through `+test4`, plus the typo'd `chris+test2@bluecollariai.online` (doesn't deliver). Not blocking. Cleanup whenever convenient via Supabase Dashboard → Authentication → Users.
- **Browser-Claude plugin (Claude in Chrome) is unreliable for shared-component edits** — it mangled `layout.tsx` with duplicated closing tags during the header-link task. Use it only for isolated new-file work where the blast radius is small. Claude Code is the default for any work touching `layout.tsx`, the dashboard layout, `globals.css`, or other shared files.
- **Migration drift recovery pattern established** — when SQL is applied via Supabase SQL Editor (not via `supabase db push`), the CLI tracking row must be repaired with `supabase migration repair --status applied <version>`. Used today for 0006.
- **Vercel env vars: value must go in the Value field, not the Note field** — the Note field is just a label and is ignored at runtime. This caused the `NEXT_PUBLIC_SITE_URL` outage above.
- **Migration runner footnote** — 0001 + 0002 were applied via a one-shot Node + node-pg script before the Supabase CLI was wired up; their migration-history tracking entries were repaired with `supabase migration repair --status applied 0001 0002`. Visible in CLI as applied; nothing to redo.
