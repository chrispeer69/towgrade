# TowGrade — Database Schema (v0.3 — decisions locked)

> **Purpose:** Postgres schema for TowGrade, written for someone new to backend dev. Each table has a plain-language *why* before the technical definition.
>
> **v0.3 changes:** all open decisions resolved (see "Locked decisions" at the bottom). Fleet-size buckets refined to 5 tiers; review-edit lock tied to quarter close instead of a 30-day timer; UI period dropdown clarified as display-only.
>
> **v0.3 final tweaks:** collapsed `insurer_rsa` into a single `insurer_direct` provider type (we'll subdivide later if data warrants); merge conflicts on the unique-constraint edge case now flag to admin review instead of auto-resolving by score.
>
> **v0.2 changes:** added `admins` table, added provider lifecycle fields (`aliases`, `merged_into_id`, `deleted_at`), added `admin_actions` audit log, added seed-data list including Geico Emergency Roadside.

---

## Background concepts (skip if you know them)

- **Table** = a spreadsheet. Each row is one record (one operator, one review, etc).
- **Column** = a field on that record (email, score, date).
- **Primary key (PK)** = the unique ID for a row. We use `uuid` (a long random string) so IDs can't be guessed.
- **Foreign key (FK)** = a column that points to a row in another table. E.g. `reviews.operator_id` → `operators.id`.
- **JSONB** = a structured blob (small JSON object) stored in one column. Flexible; harder to query than flat columns.
- **Index** = a lookup shortcut. Without indexes, queries scan every row. With indexes, they're instant. Costs a tiny bit of write speed and disk.
- **Constraint** = a rule the database enforces (e.g. unique email, score 1–10). Catches bugs at the data layer.
- **Soft delete** = setting a `deleted_at` timestamp instead of removing the row. Preserves history; queries filter it out.

---

## The 7 tables

```
admins ──verifies──> operators ──< reviews >── providers ──merged_into──> providers
                                                  │           (self-ref)
admins ──manages────────────────────────────────┘
admins ──< admin_actions  (audit log)

oem_subscribers ──< report_downloads
```

`operators` write `reviews` about `providers`. `admins` verify operators and manage providers. `oem_subscribers` download reports, logged in `report_downloads`.

---

## 1. `operators`

**What it is:** One row per towing-company person who signs up. They write reviews.

**Why it exists:** We need to know who's submitting reviews so we can (a) verify they're real towers, (b) prevent spam, (c) keep their identity private from OEMs forever.

```
operators
─────────
id                  uuid          PK, default gen_random_uuid()
first_name          text          not null
last_name           text          not null
company_name        text          not null
state               text          not null  -- 2-letter US state code
fleet_size          text          not null
                                  -- "1-5", "6-20", "21-50", "51-100", "100+"
email               text          not null, unique, lowercase
password_hash       text          not null  -- bcrypt/argon2, NEVER plain
dot_number          text          nullable  -- optional, adds verification weight
verification_status text          not null, default 'pending'
                                  -- pending | verified | rejected
verified_at         timestamptz   nullable
verified_by         uuid          nullable, FK → admins.id
created_at          timestamptz   not null, default now()
updated_at          timestamptz   not null, default now()
last_login_at       timestamptz   nullable

-- Indexes
unique index on (lower(email))
index on (verification_status)  -- admin queue queries
index on (state)                -- regional analytics
```

**Plain-English notes:**
- `password_hash` — never store passwords in plain text. The hash is a one-way scramble.
- `verification_status` is a **state**, not a boolean — pending / verified / rejected. Matches the manual queue in CLAUDE.md §6 Phase 2.
- `dot_number` optional; some legitimate small operators don't have one.

**✅ LOCKED — Fleet size:** text bucket with 5 tiers: `"1-5"`, `"6-20"`, `"21-50"`, `"51-100"`, `"100+"`. The 51-100 split off the old `"50+"` bucket because that's the segment OEMs care most about — fleets large enough to have meaningful market share but not yet enterprise.

---

## 2. `admins`

**What it is:** One row per TowGrade staff member with admin access.

**Why it exists:** Verifying operators, managing providers, and merging duplicates are sensitive actions. Admins need their own auth, separate from operators (different login flow, different permissions, different attack surface).

```
admins
──────
id              uuid          PK
email           text          not null, unique, lowercase
password_hash   text          not null
full_name       text          not null
role            text          not null, default 'verifier'
                              -- 'super_admin' | 'verifier'
created_at      timestamptz   not null, default now()
last_login_at   timestamptz   nullable
disabled_at     timestamptz   nullable  -- soft-disable instead of delete

-- Indexes
unique index on (lower(email))
index on (role)
```

**Plain-English notes:**
- Two roles only, kept deliberately simple:
  - **`verifier`** — can approve/reject operators and view the verification queue.
  - **`super_admin`** — everything `verifier` can do, plus manage providers (add/edit/merge/delete) and manage other admins.
- We don't reuse `operators` for admin auth. Even if a tower happens to also be staff, they'd have two separate accounts. Mixing roles in one table is how you accidentally give an admin the ability to write reviews that count toward aggregates.
- `disabled_at` (not delete) preserves the audit trail. A removed admin's past actions in `admin_actions` should still be attributable.

**No new decision flagged**, but FYI: if you later want finer permissions (e.g. an admin who can merge providers but not delete them), we'd swap `role text` for a separate `admin_permissions` table. For now, two roles is enough.

---

## 3. `providers`

**What it is:** One row per roadside-assistance company that gets reviewed.

**Why it exists:** Reviews need something to point at. Also holds the visual identity (color, abbreviation) for the letter-mark avatars in CLAUDE.md §4.

```
providers
─────────
id                uuid          PK
name              text          not null   -- "Agero"
slug              text          not null, unique  -- "agero" (URL-safe)
abbr              text          not null   -- "AG" (2-letter avatar text)
brand_color       text          not null   -- hex like "#1A56C4"
provider_type     text          not null
                                -- 'motor_club' | 'rsa_network' | 'insurer_direct'
website           text          nullable
aliases           text[]        not null, default '{}'
                                -- former names, common misspellings
                                -- e.g. ['NSD', 'Nation Safe Drivers Inc']
merged_into_id    uuid          nullable, FK → providers.id (self-ref)
merged_at         timestamptz   nullable
deleted_at        timestamptz   nullable  -- soft delete
deleted_by        uuid          nullable, FK → admins.id
created_at        timestamptz   not null, default now()
created_by        uuid          nullable, FK → admins.id
updated_at        timestamptz   not null, default now()

-- Constraints
check ((merged_into_id IS NULL) = (merged_at IS NULL))
check (merged_into_id IS NULL OR merged_into_id <> id)  -- can't merge into self

-- Indexes
unique index on (slug)
index on (deleted_at)              -- public scoreboard filters this out
index on (merged_into_id)          -- "what merged into X?" queries
index on using gin (aliases)       -- search by alias
```

**Plain-English notes:**

- **`aliases`** — a list of former names, abbreviations, and common variants. Used for search ("did anyone search for 'NSD' instead of 'Nation Safe Drivers'?") and to preserve discoverability after a rebrand. Empty by default for existing providers; populated when a provider rebrands or when we merge a duplicate in.
- **`deleted_at` (not `is_active`)** — switched from a boolean to a nullable timestamp. Tells us not just *that* a provider was removed, but *when* and (via `deleted_by`) *who*. A provider is "live" iff `deleted_at IS NULL AND merged_into_id IS NULL`. The public scoreboard filters on this.
- **`merged_into_id` + `merged_at`** — when admin determines two provider records are the same company (e.g. "Roadside Masters" and "Roadside Masters LLC"), one becomes the *survivor* and the other becomes a *tombstone* pointing at the survivor.

### How a merge works (mechanically)

User said: *"merge providers (reassign reviews to primary)"*. Two-step transaction:

1. **Reassign reviews:** `UPDATE reviews SET provider_id = <survivor_id> WHERE provider_id = <merged_id>` — this rewrites pointers, so all aggregate queries naturally include the merged data with no special logic needed downstream.
2. **Tombstone the merged record:** set `merged_into_id = <survivor_id>`, `merged_at = now()`, copy its `name` into the survivor's `aliases` array, and set `deleted_at = now()` so it stops showing as live.

**Why a tombstone instead of hard-delete:** preserves the audit trail (who merged what, when, into what), and any URL like `/providers/old-slug` can 301-redirect to the survivor by following the pointer. The merged row stays in the DB but never appears in queries.

**Care needed on the unique constraint:** `reviews` has `unique (operator_id, provider_id, period)`. If an operator reviewed *both* providers in the same period, the merge will violate the constraint.

**Resolution policy: flag for admin review at merge time — never auto-rewrite operator data.** The principle: a merge tool that silently picks a "winner" between two real reviews is changing what an operator actually said about a provider. That violates the trust contract. Instead, the merge UI surfaces every conflicting pair, and an admin makes a per-case decision (keep one, contact the operator, defer the merge, etc). The chosen resolution is logged in `admin_actions` with both original review IDs in `metadata` so the trail is auditable. Detailed UX in Phase 2.

**No new decisions flagged here** — the design follows your stated requirements directly.

---

## 4. `reviews` ⭐ (the most important table)

**What it is:** One row per review an operator submits about a provider for a given period.

**Why it exists:** This is the entire dataset. Everything else — public scoreboard, OEM reports, comparisons — is computed from this table.

```
reviews
───────
id                  uuid          PK
operator_id         uuid          not null, FK → operators.id
provider_id         uuid          not null, FK → providers.id
period              text          not null  -- "2026-Q2"
category_scores     jsonb         not null
                                  -- { "pay_rate_adequacy": 7,
                                  --   "payment_speed": 4, ... }
narratives          jsonb         not null, default '{}'
                                  -- { "pay_rate_adequacy": "Rates are...",
                                  --   "overall_summary": "..." }
overall_score       numeric(3,1)  not null  -- denormalized avg
would_recommend     boolean       nullable
is_public           boolean       not null, default false
counts_in_aggregate boolean       not null, default false
                                  -- true ONLY when operator is verified
                                  -- AND is_public=true
created_at          timestamptz   not null, default now()
updated_at          timestamptz   not null, default now()

-- Constraints
unique (operator_id, provider_id, period)
check (overall_score between 1.0 and 10.0)

-- Indexes
index on (provider_id, counts_in_aggregate)
index on (operator_id, created_at desc)
index on (period, provider_id)
```

**Plain-English notes:**

- **`category_scores` as JSONB** — 12 categories. JSONB is the middle ground between 12 columns and a separate `review_scores` table: flexible if categories change, no JOIN needed.
- **`narratives` separate from scores** — keeps the privacy line crisp. Even though both are JSONB, separating makes it impossible to accidentally include narratives in an aggregate query.
- **`is_public` vs `counts_in_aggregate`** — two booleans, deliberately:
  - `is_public` = the operator's *intent*.
  - `counts_in_aggregate` = the system's *verdict* (`is_public AND operator_is_verified`). Computed at write time. The public scoreboard filters on this. Two columns prevents the bug where an unverified operator's review accidentally counts.
- **`overall_score` denormalized** — redundant (it's the avg of `category_scores`) but stored to avoid recomputing per-review averages on every public-scoreboard query.
- **Unique constraint** implements the rate limit from CLAUDE.md §6 Phase 2: one review per operator per provider per period.
- **Soft-deleted providers**: their reviews stay in the table with `provider_id` intact. Public scoreboard JOINs `providers` and filters `WHERE providers.deleted_at IS NULL`, so they vanish from the UI but historical data is preserved.

**✅ LOCKED — Review period storage:** quarterly (`"2026-Q2"`). Every review is bucketed into the calendar quarter it was submitted in.

**UI vs storage distinction (important):** the prototype's "review period" dropdown (Last 30 days / 90 days / 6 months / 12 months / all-time) is **operator-facing context only** — it tells the operator the timeframe their qualitative judgment should cover ("how was this provider over the last 90 days?"). The dropdown selection is **not stored** on the review row and does **not** affect aggregation. The `period` column is always derived server-side from `created_at`.

If we later want to capture which timeframe the operator was reflecting on, we'd add a separate `reflection_window` column rather than overloading `period`. Flagging so it doesn't get conflated.

**✅ LOCKED — Edit policy:** reviews are editable until the calendar quarter closes, then locked forever. No 30-day timer.

**Implementation note:** "Is this review still editable?" becomes a pure function of `(now(), period)` — no per-review timer column needed. A review with `period = '2026-Q2'` is editable while `now() <= '2026-06-30 23:59:59 UTC'`, locked thereafter. The lock is enforced by the application layer (and ideally by a row-level security policy in Supabase) on every UPDATE.

Implication: a review submitted on the last day of a quarter has only hours of edit window, while one submitted on day 1 has nearly 90 days. That's the correct tradeoff per your decision — historical OEM reports must be stable, and quarter close is the natural seal.

---

## 5. `oem_subscribers`

**What it is:** One row per paying OEM/insurer organization with access to intelligence reports.

**Why it exists:** Revenue side. Separate from `operators` because of different fields, login flow, and access rules.

```
oem_subscribers
───────────────
id                  uuid          PK
organization        text          not null
contact_first_name  text          not null
contact_last_name   text          not null
contact_email       text          not null, unique
role                text          not null   -- 'oem' | 'insurer' | 'motor_club'
tier                text          not null   -- 'single_provider' | 'full_network' | 'enterprise'
contract_start      date          not null
contract_end        date          not null
stripe_customer_id  text          nullable   -- linked in Phase 4
is_active           boolean       not null, default true
created_at          timestamptz   not null, default now()

-- Indexes
unique index on (lower(contact_email))
index on (is_active, contract_end)
```

**Plain-English notes:**
- Fully separate from `operators`. Different login flow, different data access.
- `tier` placeholder until Stripe is wired up in Phase 4. Storing it locally lets us gate features without hitting Stripe per request.
- No password column yet — auth may be magic link / SSO / sales-managed; can add `password_hash` later.

**No decisions needed** — refined in Phase 4 with billing.

---

## 6. `report_downloads`

**What it is:** Audit log of every report an OEM downloads.

**Why it exists:** (1) compliance — who accessed what; (2) renewals — "you downloaded 14 reports last quarter"; (3) abuse detection.

```
report_downloads
────────────────
id              uuid          PK
subscriber_id   uuid          not null, FK → oem_subscribers.id
report_type     text          not null   -- 'quarterly_network' | 'provider_deep_dive' | 'comparison'
report_period   text          not null   -- "2026-Q2"
provider_id     uuid          nullable, FK → providers.id  -- null for network-wide
file_format     text          not null   -- 'pdf' | 'csv' | 'json'
ip_address      inet          nullable
user_agent      text          nullable
downloaded_at   timestamptz   not null, default now()

-- Indexes
index on (subscriber_id, downloaded_at desc)
index on (report_period, report_type)
```

**Plain-English notes:**
- Append-only log. Never updated, never deleted.
- `inet` is a Postgres type for IP addresses, more efficient than text.

---

## 7. `admin_actions`

**What it is:** Audit log of every sensitive thing an admin does — verifying an operator, adding/editing/merging/deleting a provider, disabling another admin.

**Why it exists:** Trust. The platform's credibility depends on the rule that "providers cannot pay to suppress scores" (CLAUDE.md §8 #4). If an admin ever suspiciously deletes a provider or rejects a verified-looking operator, we need an audit trail to investigate. Append-only.

```
admin_actions
─────────────
id           uuid          PK
admin_id     uuid          not null, FK → admins.id
action       text          not null
                           -- 'operator.verify' | 'operator.reject'
                           -- | 'provider.create' | 'provider.update'
                           -- | 'provider.merge' | 'provider.delete'
                           -- | 'admin.disable'
target_type  text          not null   -- 'operator' | 'provider' | 'admin'
target_id    uuid          not null
metadata     jsonb         not null, default '{}'
                           -- merge: { "merged_into_id": "...", "review_count": 47 }
                           -- update: { "before": {...}, "after": {...} }
ip_address   inet          nullable
created_at   timestamptz   not null, default now()

-- Indexes
index on (admin_id, created_at desc)
index on (target_type, target_id)   -- "show me everything done to provider X"
index on (action, created_at desc)
```

**Plain-English notes:**
- The `metadata` JSONB is intentionally flexible — every action type stores different context. For a merge it captures what merged into what and how many reviews moved. For an update it captures before/after diffs.
- Append-only. The app should never `UPDATE` or `DELETE` rows here. We can enforce that with a Postgres revoke statement on the table.

---

## Initial seed data (providers)

The first migration populates `providers` with this list. `aliases` is empty for all initial entries; we'll fill them in as needed.

| name | slug | abbr | type | notes |
|------|------|------|------|-------|
| Agero | `agero` | AG | motor_club | |
| AAA | `aaa` | AA | motor_club | |
| Urgently | `urgently` | UR | rsa_network | |
| HONK | `honk` | HK | rsa_network | |
| Allstate Roadside | `allstate-roadside` | AL | insurer_direct | |
| Cross Country Motor Club | `cross-country` | CC | motor_club | |
| Nation Safe Drivers | `nation-safe-drivers` | NS | motor_club | |
| USAA Roadside | `usaa-roadside` | US | insurer_direct | |
| Auto Club Group | `auto-club-group` | AC | motor_club | |
| Roadside Masters | `roadside-masters` | RM | rsa_network | |
| **Geico Emergency Roadside** | `geico-er` | **GE** | insurer_direct | **NEW per v0.2** |

> **Note on insurer types:** Allstate, USAA, and Geico ER all use `insurer_direct` — a single category. The earlier draft split insurers into `_rsa` (white-label a third-party network) vs `_direct` (handle dispatch in-house). Collapsed in v0.3 final tweaks: not enough data yet to know whether the distinction matters to OEM buyers. Easy to subdivide later by promoting `provider_type` to a richer field or adding a `dispatch_model` column.

`brand_color` values to be picked from the prototype palette during the migration (will pull from `towgrade.html`).

---

## What's deliberately NOT in this draft

- **Aggregate cache tables** — Phase 3 nightly cron writes into something like `provider_aggregates_by_period`. Derived data, separate doc.
- **Issue tags** — Phase 3 NLP pass on narratives → `narrative_issue_tags` table. Defined when the NLP pipeline is real.
- **Email verification tokens, password reset tokens, sessions** — Supabase Auth handles these in its own `auth.*` schema.
- **`reviews_archive`** — referenced above as the destination for the losing review when a merge causes a uniqueness conflict. Will design when we build the merge tool.
- **Per-OEM dashboard query indexes** — tuned once we see real query patterns.

---

## Locked decisions

| # | Decision | Resolution |
|---|----------|------------|
| 1 | Fleet size storage | ✅ Bucket, 5 tiers: `"1-5"`, `"6-20"`, `"21-50"`, `"51-100"`, `"100+"` |
| 2 | Review period granularity | ✅ Quarterly (`"2026-Q2"`); UI period dropdown is display-only |
| 3 | Edit policy on submitted reviews | ✅ Editable until quarter closes, then locked forever |
| 4 | `is_public` and `counts_in_aggregate` as separate columns | ✅ Kept separate (intent vs. system verdict) |
| 5 | Insurer provider type granularity | ✅ Single `insurer_direct` category for now (Allstate, USAA, Geico ER); revisit if data warrants |
| 6 | Merge edge case: same-period reviews on both providers | ✅ Flag for admin review at merge time — never auto-rewrite operator data |

**v0.2 design choices made silently** (also locked unless you push back):
- `admins.role` is a simple two-value enum (`super_admin` / `verifier`), not a permissions table.
- Providers use `deleted_at` (soft-delete), not an `is_active` boolean.
- Provider merges *rewrite* `reviews.provider_id` to the survivor; the merged record becomes a tombstone pointing back via `merged_into_id`.
- `admin_actions` is a single audit table with a flexible `metadata` JSONB.

**Schema is now ready to be migrated into code.** Next step: scaffold the Next.js + Supabase app and translate this doc into actual migration files. Awaiting go-ahead.
