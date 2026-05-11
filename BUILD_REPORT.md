# TowGrade — Senior-Developer Handoff Report

_Generated 2026-05-11 from branch `chore/build-report`. Source of truth for the items below is the repo at this commit; STATUS.md captures the founder's narrative._

---

## 1. Snapshot

TowGrade is a verified, anonymous reporting platform where towing-company operators grade roadside-assistance providers across 14 operational categories. Aggregate scores feed a public scoreboard and (post-beta) paid intelligence reports for OEMs and insurers. Operator anonymity is a load-bearing product property — narratives never leave the database, and only verified operators' public reviews count toward aggregates.

| | |
|---|---|
| Live URL | https://www.towgrade.com |
| Repo | https://github.com/chrispeer69/towgrade (private) |
| Current phase | Phase 6.7 shipped; pre-beta backlog open (see §7) |
| Branch at handoff | `main` (this report lives on `chore/build-report`) |
| Last commit on main | `2931242` — *docs(status): Phase 6.7 PKCE fix shipped and verified* — 2026-05-05 |
| Last code commit on main | `f2055eb` — *fix(auth): derive emailRedirectTo from request origin to fix PKCE on preview deployments* (PR #8) — 2026-05-05 |
| Node | v24.15.0 (local dev environment) — no `engines` pin in `package.json`. Not determined from repo whether Vercel pins a different version. |
| Package manager | npm 11.12.1 (lockfile is `package-lock.json`) |
| Framework | Next.js 16.2.4 (App Router), React 19.2.4, TypeScript ^5, `@supabase/ssr` ^0.10.2, `@supabase/supabase-js` ^2.105.1, `resend` ^6.12.2 |

---

## 2. Architecture

### Stack
- **Frontend:** Next.js 16 App Router, React 19 Server Components + Server Actions, plain CSS (no Tailwind, no component library). Geist font via `next/font`.
- **Backend:** Next.js Server Components / Server Actions / Route Handlers, executed on Vercel.
- **Database:** Supabase Postgres (`aayitixttvijwdjirwea`, region `us-east-2`).
- **Auth:** Supabase Auth (email + password, PKCE confirmation flow). No middleware — auth is enforced in route layouts via `getOperator()` (`src/lib/operator.ts`) and `getAdmin()` (`src/lib/admin.ts`).
- **Email:** Two distinct Resend integrations.
  1. Supabase Auth custom SMTP (`smtp.resend.com`) for the "Confirm signup" template. Sender: `noreply@towgrade.com`.
  2. Direct Resend SDK from app code (`src/lib/resend.ts`, `src/lib/notifications/notify-admins-new-operator.ts`) for per-registration admin notifications. Sender: `noreply@send.towgrade.com` (apex `towgrade.com` is occupied in another Resend account — see §8).
- **Hosting:** Vercel project `towgrade`. Auto-deploy on push to `main`; per-branch preview deployments for every other push.
- **CI:** GitHub Actions — CodeQL only (no test job exists). Dependabot for weekly grouped dep updates.

### Data flow for the primary user journey (operator registration → confirmation → admin notification)

1. Operator submits `/register` form (`src/app/register/RegisterForm.tsx`, `useActionState`).
2. Server Action `registerOperator` (`src/app/register/actions.ts`):
   - Validates fields against `STATE_CODES` / `FLEET_SIZES` allowlists and email regex.
   - Calls `supabase.auth.signUp` via the **SSR client** so the PKCE code verifier lands in cookies; `emailRedirectTo` is built from `getRequestOrigin()` (reads `x-forwarded-host` / `host` from the live request — this is the Phase 6.7 fix).
   - Inserts the `operators` row via the **service-role client** (`createAdminClient`) — `operators` has no INSERT policy for `authenticated`. On insert failure, the auth user is rolled back with `admin.auth.admin.deleteUser`.
3. Supabase sends the branded "Confirm signup" email through Resend SMTP. The link points at `${requestOrigin}/auth/callback?code=...` (no query string beyond `code`, to match Supabase's strict allowlist).
4. User clicks the link → `src/app/auth/callback/route.ts` runs:
   - Exchanges the PKCE code for a session via the SSR client (cookies set).
   - Reads `operators` (service role) for the confirmed user; if `verification_status='pending'` AND `admin_notified_at IS NULL`, schedules `notifyAdminsNewOperator(operatorId)` via `after()` from `next/server`.
   - Redirects to `/dashboard` immediately; email work runs after the response.
5. `notifyAdminsNewOperator` (`src/lib/notifications/notify-admins-new-operator.ts`):
   - Atomically claims `operators.admin_notified_at` with an `UPDATE ... WHERE admin_notified_at IS NULL ... RETURNING ...`. Only the caller whose UPDATE affects the row proceeds. Repeat / concurrent callers exit silently.
   - Fans out a branded email to every active admin (`disabled_at IS NULL`) via Resend SDK. Errors are logged and swallowed; the claim is **not** rolled back on failure (preventing duplicate spam wins over preserving a retry opportunity).
6. Admin visits `/admin`, sees the operator in the pending queue, clicks Approve or Deny → server action `decideOperator` (`src/app/admin/actions.ts`) updates `verification_status` + `verified_at` + `verified_by` and writes an `admin_actions` audit row. Trigger `trg_operators_verification_propagate` (0008) re-runs the per-row `set_counts_in_aggregate` trigger across all the operator's reviews.

### Auth model

| Surface | Who can read/write | Enforcement |
|---|---|---|
| `/`, `/scoreboard` | anon | `providers_public_read` (live, unmerged) + `reviews_public_aggregate_read` (only `counts_in_aggregate=true`) on `providers`/`reviews`; views `public_providers` / `public_reviews` strip `narratives` |
| `/register`, `/login`, `/auth/callback` | anon | Public routes |
| `/dashboard/*` | authenticated operator | Layout `getUser()` redirects unauthenticated to `/login`; `getOperator()` joins on `auth_user_id = auth.uid()` under the `operators_self_read` policy |
| `/dashboard/reviews` | authenticated operator (own reviews) | `reviews_self_read` policy on `reviews.operator_id` → own `operators.id` |
| `/dashboard/account` UPDATE | authenticated operator (own row, 5 columns) | Column-level `GRANT UPDATE(first_name,last_name,company_name,state,fleet_size)` + `operators_self_update` RLS (USING+WITH CHECK on `auth_user_id = auth.uid()`). Postgres rejects any SET-list containing a privileged column with `42501` **before RLS runs** — this is the load-bearing protection. |
| `/dashboard/rate/[slug]` | authenticated operator | Server action uses service role for INSERT/UPDATE of own review; `is_public` toggle controls aggregate eligibility |
| `/admin/*` | authenticated admin (not `disabled_at`) | `AdminLayout` calls `getAdmin()` → `redirect("/")` if null; reads/writes use service role |
| Mutating admin actions | service role | `decideOperator`, `add/remove admin` write to `admin_actions`; trigger `block_mutations` (0002) blocks UPDATE/DELETE on the audit table; trigger `trg_admins_block_last_delete` (0013) blocks last-active-admin deletion |

**There is no `middleware.ts`.** Route-level layouts perform the auth check. This is fine for the current surface area but means each new protected route must remember to call `getOperator()` / `getAdmin()` itself.

### Operator anonymity — how it's architecturally enforced

1. **Narratives never leave the database in any public surface.** The `public_reviews` view (`supabase/migrations/0002_rls.sql:125-138`) explicitly does not select `narratives`. The view is the only path anon clients are supposed to use; the underlying table grants are needed only because `security_invoker = true` views check the caller's privileges on the base table.
2. **Aggregate-only public visibility.** The `reviews_public_aggregate_read` policy (`0003`) restricts anon SELECT on `reviews` to rows where `counts_in_aggregate = true`. The `counts_in_aggregate` column is **system-computed**, never trusted from the app: trigger `reviews_set_counts_in_aggregate` (`0002`) recomputes it on INSERT/UPDATE from `is_public AND operators.verification_status='verified'`.
3. **Five-review threshold for score visibility.** `public_providers` (extended in `0007`) returns `aggregate_overall_score` and `aggregate_recommend_pct` as `NULL` until `aggregate_review_count >= 5`. The UI (`/scoreboard`, landing chips) renders pre-threshold placeholders.
4. **No reverse-lookup column on `reviews`.** `reviews.operator_id` is the only operator linkage; it is never projected into any public view or returned by any anon-readable column set. An anon caller hitting `reviews` directly is gated to `counts_in_aggregate=true` rows but still has no path to operator identity since the view used in product code is `public_reviews`, which doesn't include `operator_id` either.
5. **Self-read policies are scoped by `auth.uid()`.** `operators_self_read` (0004), `reviews_self_read` (0010), `admins_self_read` (0009) all key on `auth_user_id = auth.uid()` so operator A cannot read operator B under any authenticated session.

---

## 3. Repository Layout

### Top-level, depth 2

```
.claude/             # Claude Code workspace settings (gitignored content)
.github/
  dependabot.yml
  workflows/codeql.yml
prototypes/          # Original HTML mockups (towgrade.html etc.) — design reference only
public/              # Static assets served by Next.js
src/
  app/               # App Router routes + layouts + server actions
  lib/               # Shared server/client helpers + types + email templates
supabase/
  migrations/        # 0001..0013, SQL files applied via `npx supabase db push`
AGENTS.md
CLAUDE.md
README.md            # create-next-app boilerplate, not load-bearing
SCHEMA.md            # The data-model spec; migrations implement this
STATUS.md            # Founder's running build log (source of truth for "what's working")
SESSION_HANDOFF.md   # Untracked — present locally only
TOWGRADE_PROGRESS_2026-04-29.docx
eslint.config.mjs
next.config.ts       # Empty config object
tsconfig.json        # path alias `@/* → ./src/*`
package.json
package-lock.json
next-env.d.ts
tsconfig.tsbuildinfo
.env.example
.env.local           # gitignored; not read for this report
.gitignore
```

### Where things live

| Concern | Location |
|---|---|
| Business logic (auth, registration, verification, notifications, review submission, admin management) | `src/app/*/actions.ts` (Server Actions) and `src/app/auth/callback/route.ts` |
| UI components (Client Components) | Colocated with their route, e.g. `src/app/register/RegisterForm.tsx`, `src/app/dashboard/rate/[slug]/RateForm.tsx`, `src/app/admin/AdminTabs.tsx` |
| Server Components / page layouts | `src/app/**/page.tsx`, `src/app/**/layout.tsx` |
| Shared helpers | `src/lib/operator.ts`, `src/lib/admin.ts`, `src/lib/site-url.ts`, `src/lib/period.ts`, `src/lib/profile-options.ts` |
| Supabase client factories | `src/lib/supabase/{server,client,admin}.ts` |
| Generated DB types | `src/lib/supabase/types.ts` |
| Email templates / dispatch | `src/lib/emails/admin-new-operator.ts`, `src/lib/notifications/notify-admins-new-operator.ts`, `src/lib/resend.ts` |
| DB schema | `supabase/migrations/0001..0013_*.sql` |
| Shared types | `src/lib/supabase/types.ts` (generated `Database` type) plus per-feature type aliases inline in `src/lib/operator.ts`, `src/lib/admin.ts` |

---

## 4. Database

13 migrations, all applied to the linked Supabase project. Naming convention: `NNNN_short_description.sql`, zero-padded 4-digit prefix, snake_case. New migrations are applied with `npx supabase db push`; out-of-band edits via the SQL Editor are reconciled with `supabase migration repair --status applied <version>` (this was needed for 0001/0002 pre-CLI and for 0006).

### Tables

| Table | Purpose | Key columns | RLS posture |
|---|---|---|---|
| `admins` | Internal staff who verify operators and manage the system | `id`, `email` (unique, lowercased), `full_name`, `role` (`super_admin`\|`verifier`), `auth_user_id` (FK to `auth.users` from 0008), `disabled_at` | RLS on. `admins_self_read` (0009) for `authenticated` on own row. All mutations go via service role. BEFORE DELETE trigger blocks removing the last active admin. |
| `operators` | Towing-company owners who submit reviews | `id`, `auth_user_id` (FK to `auth.users`, unique, ON DELETE CASCADE), `email` (unique, lowercased), `first_name`, `last_name`, `company_name`, `state` (2-letter), `fleet_size` (enum), `verification_status` (`pending`\|`verified`\|`rejected`), `verified_at`, `verified_by` (FK admins), `admin_notified_at` (0012, atomic dedup of first-confirm notification) | RLS on. `operators_self_read` (0004) for own row. `operators_self_update` (0011) for own row, gated by column-level `GRANT UPDATE` on the 5 editable columns only. No INSERT policy for authenticated — registration uses service role. |
| `providers` | Roadside-assistance brands operators rate | `id`, `name`, `slug` (unique), `abbr` (2-4 uppercase), `brand_color` (hex), `provider_type` (`motor_club`\|`rsa_network`\|`insurer_direct`), `aliases` (text[]), `merged_into_id` (FK self, soft-merge), `deleted_at` (soft-delete) | RLS on. `providers_public_read` (0002) for `anon`/`authenticated` on live, unmerged rows. 11 providers seeded in 0001. |
| `reviews` | Per-operator, per-provider, per-quarter scorecards | `id`, `operator_id` (FK), `provider_id` (FK), `period` (`YYYY-Qn`), `category_scores` (jsonb, 14 categories), `narratives` (jsonb — **never exposed publicly**), `overall_score` (1.0–10.0), `would_recommend` (bool), `is_public` (bool), `counts_in_aggregate` (bool, **trigger-computed**). UNIQUE `(operator_id, provider_id, period)`. | RLS on. `reviews_public_aggregate_read` (0003) for `anon`/`authenticated` on `counts_in_aggregate=true`. `reviews_self_read` (0010) for own reviews. Quarter-close lock trigger (0002) blocks UPDATEs after period end (bypassable for system propagation via tx-local GUC, 0008). Append-only protection on audit tables uses the same `block_mutations` pattern. |
| `oem_subscribers` | Paid OEM / insurer / motor-club access accounts (post-beta surface) | `id`, `organization`, `contact_email` (unique), `role`, `tier`, `contract_start/end`, `stripe_customer_id`, `is_active` | RLS on. No policies yet — service role only. |
| `report_downloads` | Audit log of subscriber report downloads | `id`, `subscriber_id` (FK), `report_type`, `report_period`, `provider_id`, `file_format`, `ip_address`, `user_agent`, `downloaded_at` | RLS on. Append-only via `block_mutations` trigger + REVOKE of UPDATE/DELETE from anon/authenticated. No SELECT policies — service role only. |
| `admin_actions` | Append-only audit log of admin operations | `id`, `admin_id` (FK admins, **nullable** + ON DELETE SET NULL per 0013), `action` (enum extended to include `admin.add`/`admin.remove` in 0013), `target_type` (`operator`\|`provider`\|`admin`), `target_id`, `metadata` (jsonb), `ip_address`, `created_at` | RLS on. Append-only: `block_mutations` trigger + REVOKE of UPDATE/DELETE from anon/authenticated. Service-role reads/writes only. |

### Views

- `public_providers` — `security_invoker=true`. Used by `/`, `/scoreboard`. Extended in 0007 to include `aggregate_review_count`, `aggregate_overall_score`, `aggregate_recommend_pct` (last two `NULL` below the 5-review threshold).
- `public_reviews` — `security_invoker=true`. Strips `narratives`. The only safe public surface on review rows.

### Migration mechanics

- Local + Remote tracking confirmed in sync per STATUS.md.
- Apply: `npx supabase db push` (CLI linked to remote).
- Repair drift: `npx supabase migration repair --status applied <version>` after SQL-Editor-applied migrations.
- Migration count: **13**.

---

## 5. Environment & Config

### Env vars read from code (`process.env.*` in `src/`)

| Var | Where read | Public? | Purpose |
|---|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `src/lib/supabase/server.ts:8`, `src/lib/supabase/client.ts:5`, `src/lib/supabase/admin.ts:15` | Public | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `src/lib/supabase/server.ts:9`, `src/lib/supabase/client.ts:6` | Public | Supabase anon publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | `src/lib/supabase/admin.ts:16` | **Server-only** | Service-role key, bypasses RLS. Guarded by `import "server-only"`. [REDACTED] |
| `RESEND_API_KEY` | `src/lib/resend.ts:17` | **Server-only** | Resend SDK key for the admin-notification email path. Distinct from the SMTP credential Supabase Auth uses. [REDACTED] |
| `NEXT_PUBLIC_SITE_URL` | `src/lib/site-url.ts:17` | Public | Production-only origin override for non-cookie-bound absolute-URL construction (admin email CTAs). |
| `VERCEL_BRANCH_URL` | `src/lib/site-url.ts:20` | Vercel-provided | Preview-deploy origin fallback for `getSiteUrl()`. |

`.env.example` documents these plus two CLI-only vars (`SUPABASE_ACCESS_TOKEN`, `SUPABASE_DB_URL`) used by `npx supabase` for migrations. Not read by the app.

### Per-environment differences

| | Dev (localhost) | Vercel Preview | Vercel Production |
|---|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | unset → `getSiteUrl()` falls back to `http://localhost:3000` | unset → falls back to `https://${VERCEL_BRANCH_URL}` | set to `https://www.towgrade.com` |
| PKCE `emailRedirectTo` for signup | derived from `getRequestOrigin()` (request `host`) → `http://localhost:3000` | derived from `getRequestOrigin()` → matches the *exact* hostname the signup form was submitted to. This is the Phase 6.7 fix: `*.vercel.app` is on the public suffix list, so deployment-hash vs branch-alias hostnames have non-shared cookies — the PKCE verifier only survives the round trip if email link returns to the same host. | `getRequestOrigin()` → `https://www.towgrade.com` |
| Admin-notification CTA URL | `http://localhost:3000/admin` | preview hostname `/admin` | `https://www.towgrade.com/admin` |

**Operational gotcha (documented in STATUS.md Notes):** in Vercel, env-var values must go in the Value field, not the Note field. An empty `NEXT_PUBLIC_SITE_URL` caused an outage on 2026-04-29.

### Third-party services

| Service | Responsibility |
|---|---|
| Supabase (project `aayitixttvijwdjirwea`, `us-east-2`) | Postgres database, Auth (PKCE email confirmation), Storage (not yet used) |
| Resend | (a) Supabase Auth custom SMTP for branded "Confirm signup" template (sender `noreply@towgrade.com`); (b) Direct SDK for per-registration admin notifications (sender `noreply@send.towgrade.com`). See §8 for the domain-ownership conflict that forced the split sender. |
| Vercel | Hosting, preview deploys, env-var management, auto-deploy from `main` |
| GitHub | Repo + CI (CodeQL) + Dependabot |

---

## 6. Build, Test, Deploy

### Commands (`package.json`)

```bash
npm run dev    # next dev
npm run build  # next build
npm run start  # next start
npm run lint   # eslint
```

**No typecheck script** is defined; rely on `next build` (which runs the TS compiler) or `npx tsc --noEmit`. **No test script** — there is no test suite of any kind (see §8).

### CI

- **CodeQL** (`.github/workflows/codeql.yml`): triggers on push to `main`, PRs targeting `main`, and a weekly Mondays 06:37 UTC cron. Language matrix: `javascript-typescript`. Query suite: `default` (a comment notes `security-extended` is the swap-in if broader coverage is wanted).
- **Dependabot** (`.github/dependabot.yml`): weekly npm updates. Minor + patch bundled into one PR per week (`groups.minor-and-patch`); majors fall outside the group and get per-package PRs. Labels: `dependencies`. Commit-message prefixes `chore(deps)` / `chore(deps-dev)`.
- **No build/lint/test workflow.** PR merges are not gated by anything except CodeQL.

### Deploy pipeline

- Push to any branch → Vercel builds a preview deploy. Branch previews are the verification surface for all feature work, including auth flows (unblocked by the Phase 6.7 `getRequestOrigin()` fix).
- Merge to `main` → Vercel auto-deploys to production at `https://www.towgrade.com`.

### Security-scanning posture

STATUS.md mentions a `chore/security-scanning` branch. **It is not present in this repo locally or on `origin`** — only `main` and the two `feat/phase-6-7-*` branches exist. The security-scanning work landed via PR #4 (`6068cf4 chore(security): enable Dependabot and CodeQL scanning`) and the branch was deleted post-merge. Current state: Dependabot + CodeQL enabled, no SAST beyond CodeQL's default queries, no secret-scanning workflow in the repo (GitHub's built-in secret scanning may be on at the org level — not determined from repo).

---

## 7. Current State of Work

### Last 10 commits (most recent first)

| Hash | Date | Subject |
|---|---|---|
| `2931242` | 2026-05-05 | docs(status): Phase 6.7 PKCE fix shipped and verified |
| `f2055eb` | 2026-05-05 | fix(auth): derive emailRedirectTo from request origin to fix PKCE on preview deployments (#8) |
| `62e322f` | 2026-05-04 | feat(auth): per-environment site URL helper for preview deployment compatibility (#7) |
| `6fbf2be` | 2026-05-03 | docs(status): Phase 6.6 shipped and verified; security scanning enabled |
| `b44ee53` | 2026-05-03 | feat(admin): Phase 6.6 — tabbed admin UI with manage admins + audit log (#5) |
| `6068cf4` | 2026-05-03 | chore(security): enable Dependabot and CodeQL scanning (#4) |
| `5e9e84b` | 2026-05-02 | docs(status): Phase 6.5 verified in production; document Resend domain workaround |
| `ed0e772` | 2026-05-02 | fix(phase-6-5): send admin notifications from noreply@send.towgrade.com (domain ownership workaround) |
| `e384282` | 2026-05-02 | docs(status): end-of-session May 2 — Phase 6.5 shipped; reconcile 0010-0011 + Phase 5-6 |
| `3585044` | 2026-05-02 | feat(notifications): per-registration admin notification email via Resend |

### Open branches

| Branch | Local | Remote | Purpose |
|---|---|---|---|
| `main` | ✓ | `origin/main` | Production tip. |
| `feat/phase-6-7-per-env-site-url` | ✓ | `origin/feat/phase-6-7-per-env-site-url` | Merged into `main` via PR #7 (`62e322f`). Should be deleted; left behind as a stale branch. |
| `feat/phase-6-7-fix-pkce-request-origin` | ✓ | `origin/feat/phase-6-7-fix-pkce-request-origin` | Merged into `main` via PR #8 (`f2055eb`). Same — stale, can be deleted. |
| `chore/build-report` | ✓ (this report) | (to be pushed) | The handoff report itself. |

Untracked file in the working tree: `SESSION_HANDOFF.md`. Not committed to any branch.

### Phase tracker (from STATUS.md "What's working")

- Phase 1 (Rate-a-Provider UI) — shipped
- Phase 3 (Live aggregate rollup on scoreboard) — shipped
- Phase 4 (Admin verification queue) — shipped
- Phase 5 (My Reviews list) — shipped
- Phase 6 (Account profile editing) — shipped
- Phase 6.5 (Per-registration admin notification email) — shipped
- Phase 6.6 (Tabbed admin UI + Manage Admins + Audit Log) — shipped
- Phase 6.7 (Per-environment site URL + PKCE preview fix) — shipped (most recent)

Phases 2 / 6.0–6.4 are not labeled in STATUS.md; not determined from repo whether they were renumbered out or live elsewhere.

### Pre-market (closed beta) backlog from STATUS.md

1. Forgot-password + magic-link sign-in with branded Resend templates.
2. Wire the marketing hero panel (currently hard-coded illustrative scores) to live `public_providers` aggregates the same way the chip strip is wired.
3. Unify Resend sender domain on apex `towgrade.com` once the NZ contractor releases ownership (see §8).

### Post-beta (paid) surfaces, gated to OEM/insurer roles

- Comparison Reports panel.
- OEM Intelligence panel (quarterly Network Intelligence Report).

---

## 8. Known Issues & Tech Debt

### Flagged in STATUS.md

- **Resend domain ownership conflict on `towgrade.com`.** Apex is registered in another Resend account (likely the NZ contractor's earlier-build account); cannot be reclaimed without their action. Workaround: admin notifications send from `noreply@send.towgrade.com` (subdomain we own). Operator confirmation emails still send from `noreply@towgrade.com` via Supabase Auth SMTP because SMTP doesn't validate from-domain against the account's verified domains the way the SDK does. Resolution: get the NZ contractor to release the apex domain.
- **PKCE same-browser requirement.** Operators must click the confirmation link in the same browser they registered from; otherwise `"PKCE code verifier not found in storage"`. Accepted tradeoff for the security gain.
- **`emailRedirectTo` allowlist must be exact.** Supabase URI allowlist matches strictly, so query strings are deliberately omitted; `/auth/callback` defaults `next` to `/dashboard`.
- **No automated tests.** Smoke testing is ad-hoc curl probes + manual end-to-end. Will need vitest + playwright as surface area grows.
- **Branded templates only for "Confirm signup".** Password-reset and magic-link still use Supabase defaults. Must be matched before exposing those flows.
- **Hard-coded illustrative scores in the marketing hero panel** (`src/app/page.tsx:84-127`): NSD 7.8 / AAA 7.1 / Allstate RSA 6.8 / Agero 6.4 / Urgently 5.2 / HONK 4.9 are static. STATUS.md flags this as a pre-beta blocker.
- **Stale rejected test operators** (`chris+test1..4@bluecollarai.online`) sit at `verification_status='rejected'`. Re-approval works via the queue if needed.

### TODO/FIXME/HACK comments

- `src/` — **0 matches**.
- `supabase/migrations/` — **0 matches**.

The codebase is free of TODO-style markers. Open work tracked entirely in STATUS.md prose.

### `npm audit` (no fix applied)

- 2 moderate, 0 high/critical. Both stem from a transitive `postcss <8.5.10` (GHSA-qx2v-qp2m-jg93, XSS via unescaped `</style>` in stringified output) pulled in by `next` 16.2.4. Fix is `npm install next@<latest>` whenever Next ships a release that upgrades the bundled `postcss`; the listed `fixAvailable` resolves to `next@9.3.3` which would be a hard downgrade and is not a real option.

### Other architectural items worth noting (not flagged in STATUS but visible in code)

- **No middleware.** Every protected route layout must remember to call `getOperator()` / `getAdmin()`. Easy to miss when adding new routes; consider adding `middleware.ts` if the surface grows.
- **Test operators denied by `verified_by`** point at `admin.id` of the one current admin. If that admin is removed, audit rows survive via `ON DELETE SET NULL` (0013), but `operators.verified_by` keeps a `RESTRICT`-style FK — not determined whether this would block admin deletion. Worth verifying before exercising the "remove last admin" path in production.
- **No retry surface for failed admin notifications.** `notify-admins-new-operator.ts` claims `admin_notified_at` before sending; a send failure leaves the operator in a "claimed but not delivered" state with no replay path. STATUS.md acknowledges this; a future surface should clear `admin_notified_at` on send failure or expose a manual re-send button.
- **`src/app/page.tsx` hero `live-panel`** is static, not live-wired. Same applies to the hero stats (`1,240+` operators, `18,400+` reviews) which are placeholders. The provider chip strip below is live.
- **Stale post-merge branches** (`feat/phase-6-7-*`) still on `origin`. Branch hygiene.

---

## 9. Open Questions for the Reviewer

1. **Do we add a `middleware.ts` or stay with per-route guards?** The current layout-based pattern works but assumes every author remembers to call `getOperator()` / `getAdmin()`. With OEM/insurer paid surfaces coming, a single middleware gate may pay for itself in lower defect risk.
2. **Should `notify-admins-new-operator` roll back `admin_notified_at` on send failure?** Current behavior is "prefer no spam over a retry opportunity" — which is right for a per-registration email. But once we add the OEM-subscriber notification and intelligence-report flows, the cost of a missed send may exceed the cost of a duplicate. Worth a policy decision before the next notification type lands.
3. **`reviews.operator_id` is the operator-anonymity escape hatch.** It's never projected to anon, but the column exists on the base table and service-role code reads it freely. Should we add a `view-only` "anon analyst" role that has SELECT on a more restrictive review view, so that future analytics endpoints can't accidentally project it?
4. **CodeQL is the only CI check.** Should we gate PR merges on `next build` + `eslint` + `tsc --noEmit` before adding more surface? Right now, a TypeScript error on a feature branch only surfaces on Vercel's build step.
5. **Phase numbering jumps from 1 → 3 → 4 → 5 → 6.0 → 6.5 → 6.6 → 6.7.** Was Phase 2 dropped, or does it live in a separate stream (e.g., on the `towcommand` sister repo)? Worth resolving before the senior dev tries to reconstruct intent from commit history.
6. **`operators.password_hash` is now nullable but still present** (0004). Is the bulk-import-legacy-accounts use case still real, or can we drop the column entirely? Keeping unused columns gives auditors more to ask about.
7. **What's the contingency if the NZ contractor never releases `towgrade.com` from their Resend account?** The two-sender setup works but is a foot-gun for any future copywriter who edits one template and not the other. Document the workaround in CLAUDE.md/AGENTS.md so it survives turnover?

---

## 10. What I Would Look At First

If you have 30 minutes to onboard, open these three files in order:

1. **`STATUS.md`** — the founder's running narrative. It's the only place where "why we did it this way" lives for Phases 1 through 6.7. Treat it as the source of truth for intent, then read the migration files to verify the implementation matches.
2. **`supabase/migrations/0002_rls.sql`** — defines the four locked invariants (quarter-close lock, system-computed `counts_in_aggregate`, append-only audit, narratives-never-leak public views) that the entire data model leans on. If you change anything in `reviews` or `public_*` views, you'll touch these triggers.
3. **`src/app/auth/callback/route.ts` + `src/lib/site-url.ts`** — the auth path is the most subtle moving part. `getRequestOrigin()` vs `getSiteUrl()` is the Phase 6.7 fix; misunderstanding which to use will silently break preview-deploy auth or production transactional email. Read these together with `src/app/register/actions.ts` to see the full PKCE flow end to end.
