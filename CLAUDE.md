# TowGrade — Project Brief for Claude Code

> **Purpose of this file:** This is the master context document for the TowGrade project. When Claude Code is run in this directory, it should read this file first to understand what TowGrade is, what's been built, what the architecture is, and what's next.

---

## 1. What TowGrade Is

**TowGrade** is a verified, anonymous reporting and intelligence platform for the roadside assistance industry.

- **Who uses it:** Towing company owners and operators across the U.S.
- **What they do on it:** Score and review the roadside assistance providers (motor clubs / RSA networks) they work with — companies like Agero, AAA, NSD, Urgently, HONK, Allstate RSA, Cross Country, Nation Safe Drivers, USAA Roadside, Auto Club Group, and Roadside Masters.
- **Why it exists:** To produce verified, anonymized aggregate data that OEMs (vehicle manufacturers) and insurance companies can buy to make smarter decisions about their roadside provider networks.
- **Tagline:** *"The data that holds providers accountable."*

### Three audiences
1. **Towing operators** (free): submit reviews, see industry trends, contribute to the dataset.
2. **The industry** (public scoreboard): aggregate provider scores visible to anyone.
3. **OEMs & insurers** (paid subscribers): full intelligence reports with deep aggregate data, top-issues breakdowns, trend analysis.

### Positioning / tone
**Editorial intelligence** — think *Wall Street Journal, Bloomberg Terminal, The Economist, McKinsey report*. The product must be credible enough that a Fortune 500 procurement officer at GM, Ford, State Farm, or Progressive trusts it on first glance — while still feeling built-by-towers-for-towers. The design language is restrained, refined, and editorial — never flashy or playful.

---

## 2. Core Features (Already Designed)

### For Towing Operators
- Registration flow: first/last name, company name, state, fleet size, business email, password
- Demo login button for instant access without filling out the form
- **12-category rating system** organized into 5 tabbed sections (see §3)
- **10-star rating UI** per category (intuitive, fast to fill out)
- **Privacy toggle on every review** — numeric scores can contribute to the public aggregate, while narrative comments are always 100% private
- Per-category narrative text fields (always private)
- "My Reviews" log with visibility status (Public / Private) and edit capability
- Network alerts dashboard showing real-time industry trends (e.g., "Agero — Payment delays at 47-day avg")

### For the Industry (Public)
- **Public Scoreboard** — provider scorecards with overall score, 6 metric sub-bars, review count, trend indicator (Improving / Stable / Declining)
- **Comparison Reports** — full-table comparison across all providers + change deltas

### For OEMs & Insurers (Subscribers)
- **OEM Intelligence Panel** — quarterly Network Intelligence Report header with key macro metrics (network avg payment window, dispute rate, attrition risk, top/bottom performer)
- **Numbered findings** in editorial style (F-01, F-02, F-03, F-04) with concrete recommendations
- "Export PDF" capability
- Modal "Request Data Access" form gated to OEM/insurer roles

---

## 3. The 12 Scoring Categories

Reviews are organized into **5 tabbed sections**:

**Compensation**
1. Pay rate adequacy
2. Payment speed / time to pay
3. Collections process
4. Invoice accuracy

**Operations**
5. Damage claim handling
6. Dispatch accuracy
7. Contract and rate fairness
8. GPS / ETA accuracy

**Support**
9. Responsiveness to problems
10. Communication quality
11. Account manager quality
12. Dispute resolution

**Technology**
- App / portal reliability
- Billing portal usability

**Final Assessment**
- Overall satisfaction
- Would recommend to peers
- Narrative summary (always private)

---

## 4. Design System (LOCKED IN — preserved from original prototype)

### Typography
- **Display font:** `Playfair Display` (weights 400/500/600/700) — used for the wordmark, headlines, hero h1, section h2s, KPI values, OEM report title, scoreboard scores
- **Body font:** `IBM Plex Sans` (weights 300/400/500/600) — all UI text, body copy, buttons, labels
- **Monospace:** `IBM Plex Mono` (weights 400/500) — all numeric scores, KPI numbers, comparison table values, scoreboard mini-bars

### Color tokens (CSS variables)
```css
--ink:      #0E1117;   /* near-black, primary text + dark surfaces */
--ink-90:   #1C2333;   /* dark panel surface (live preview, OEM card) */
--ink-70:   #3A4358;
--ink-50:   #64718A;
--ink-30:   #9BA7BB;
--ink-10:   #CDD4DF;   /* default border color */
--ink-05:   #E8ECF1;
--ink-02:   #F4F6F8;   /* sidebar/section alternation */
--paper:    #FAFBFC;   /* page background — slightly cooler than pure white */
--white:    #FFFFFF;   /* card surfaces */
--signal:   #1A56C4;   /* deep corporate blue — primary accent */
--signal-lt:#EBF0FB;
--signal-dk:#0F3480;
--up:       #1A7A4A;   /* dark forest green — positive */
--up-lt:    #E8F5EE;
--down:     #C0392B;   /* refined red — negative */
--down-lt:  #FBEAEA;
--warn:     #D97706;   /* amber — warning */
--warn-lt:  #FEF3C7;
```

Plus: star color is `#B8860B` (dark goldenrod) — never bright yellow.

### Geometry
- Border radii: **4px / 6px / 8px** (sm / md / lg). Tight and refined.
- Default border: `1px solid var(--ink-10)`
- Topbar height: **56px** (sticky)
- Sidebar width: **220px**
- Page max-width: **1180px**
- Body font-size: **14px**, line-height **1.6**

### Visual character
- **Editorial hierarchy:** display serif headlines + sans body + mono numbers — this combo is the entire personality of the product
- **Letter-mark provider avatars** — 36×36 colored squares with 2-letter abbreviations (AG, AA, UR, NS, HK, AL). Each provider has its own brand color.
- **Numbered findings** in OEM reports use `F-01`, `F-02` style markers in mono — feels like a real consulting deliverable
- **Provider chips** on landing page show name + tiny mono score badge (color-coded high/mid/low)
- **Dark `--ink-90` panels** sit on the white page for live data and OEM sample cards — sophisticated contrast
- **Subtle borders everywhere** — the layout is held together with hairline `--ink-10` rules, not heavy shadows
- **Pulse animation** on the live status dot only — minimal motion overall

### What this design is NOT
- ❌ Not playful, not neon, not casual, no emoji-heavy copy (functional icons only)
- ❌ Not Syne, Inter, Roboto, or generic system fonts
- ❌ Not large border radii / pill buttons / soft shadows
- ❌ Not dark-mode primary (light/paper background, dark accents only)

---

## 5. What's Been Built So Far

- ✅ **`towgrade.html`** — single-file working prototype, ~800 lines. Includes:
  - Landing page (hero with live data preview, features grid, provider chips, OEM strip, sample report card)
  - Operator app shell with sidebar nav
  - 6 panels: Overview, Rate a Provider, My Reviews, Comparison Reports, OEM Intelligence, Public Scoreboard
  - 3 modals: Register, Sign in, OEM access request
  - Working JS: tab switching, star ratings, provider selection, demo login, toast notifications
- ✅ **Full SEO meta block** — title, description, Open Graph, Twitter Card, JSON-LD `SoftwareApplication` structured data
- ✅ **`favicon.ico`** included

> **NOTE:** The HTML prototype uses in-memory state only. Nothing persists. This is the next thing to fix.

---

## 6. Production Roadmap (What to Build Next)

### Phase 1 — Backend foundation (HIGHEST PRIORITY)
- [ ] Pick a stack. Recommended: **Next.js 14 + TypeScript + Supabase** (Postgres + Auth + Storage in one).
- [ ] Database schema:
  - `operators` (id, first_name, last_name, company_name, state, fleet_size, email, password_hash, verified_at)
  - `providers` (id, name, type, abbr, color, slug)
  - `reviews` (id, operator_id, provider_id, period, category_scores JSONB, narratives JSONB, is_public BOOL, created_at)
  - `oem_subscribers` (id, organization, role, email, tier, contract_start, contract_end)
  - `report_downloads` (audit log)
- [ ] Auth: email/password + email verification (must verify operator is a real towing company before reviews count toward aggregate)
- [ ] Aggregate query layer that excludes any non-verified operators from public scores

### Phase 2 — Verification & trust
- [ ] Manual verification queue for new operators (admin reviews company name, state, fleet size against public records)
- [ ] DOT number field (optional but adds credibility)
- [ ] Rate limiting: one review per operator per provider per period

### Phase 3 — Aggregation engine
- [ ] Nightly cron that recomputes provider aggregate scores per category
- [ ] Trend deltas (this period vs last period)
- [ ] Top-issues NLP pass on private narratives → anonymized issue tags surfaced in OEM reports

### Phase 4 — OEM subscriber portal
- [ ] Stripe billing for OEM subscriptions (tiered: single-provider monitoring vs full network)
- [ ] Quarterly PDF report generation (server-side, using the existing report HTML template + Puppeteer)
- [ ] Subscriber-only API for programmatic access to aggregate data

### Phase 5 — Growth
- [ ] Public scoreboard SEO pages (one per provider, indexed)
- [ ] Operator referral program (refer another verified operator → unlock a free month of premium analytics)
- [ ] Trade show landing pages

---

## 7. Business Context

TowGrade is one product in a broader portfolio aimed at the towing industry. The monetization model:

- **Year 1:** Free for operators. Build the dataset. No revenue from TowGrade itself.
- **Year 2:** First OEM/motor club contracts. Target: 8 contracts × ~$18K/yr = $145K.
- **Year 3:** 25 enterprise contracts = ~$450K from TowGrade alone.

The free operator product is the moat. Every operator who signs up makes the dataset more valuable to enterprise buyers. **Do not add friction to the operator side.** Do not paywall the operator dashboard. Do not show ads. The operator experience must stay clean, fast, and free forever.

---

## 8. Non-Negotiables (Read These Carefully)

1. **Operator anonymity is sacred.** No individual operator's identity, company name, or scores ever appear in any OEM-facing report. Aggregate-only, always. This is the entire trust foundation of the product.
2. **Narrative comments are NEVER public.** Numeric scores can be aggregated publicly. Free-text comments stay private to the operator who wrote them and (in fully anonymized form) may inform issue categorization in subscriber reports — but are never quoted or attributed.
3. **No fake reviews.** Verification before a review counts toward public aggregates is mandatory.
4. **Providers cannot pay to suppress scores.** Ever. This is non-negotiable and should be stated publicly on the site.
5. **Preserve the design system in §4.** Do not switch fonts, change the color palette, or introduce new visual languages. The Playfair Display + IBM Plex combination is the product's voice.

---

## 9. Repo Layout (Suggested)

```
towgrade/
├── CLAUDE.md                  ← this file
├── CLAUDE_CODE_PROMPTS.md     ← cheat sheet for working with Claude Code
├── README.md
├── apps/
│   ├── web/                   ← Next.js frontend + API routes
│   │   ├── app/
│   │   │   ├── (operator)/    ← operator dashboard
│   │   │   ├── (public)/      ← public scoreboard
│   │   │   └── (oem)/         ← OEM subscriber portal
│   │   └── components/
│   └── reports/               ← PDF/DOCX report generators
├── packages/
│   ├── db/                    ← Supabase migrations + types
│   └── ui/                    ← shared design-system components
└── prototypes/
    ├── towgrade.html          ← original prototype (DO NOT DELETE)
    └── favicon.ico
```

---

## 10. How to Use This File

When you (Claude Code) are asked to work on TowGrade:

1. **Read this entire file** before suggesting any code.
2. **Open `towgrade.html`** as the second thing you do — it's the canonical reference for visual design and information architecture.
3. **Default to the Phase 1 backend tasks** unless told otherwise — that's the current bottleneck.
4. **Preserve the design system in §4** verbatim. Don't introduce new colors, fonts, or visual patterns. When you build the Next.js app, port the CSS variables and font stack directly from `towgrade.html`.
5. **Treat §8 (non-negotiables) as hard constraints.** Any feature suggestion that violates them is wrong — push back.
6. **Ask before changing the database schema in §6.**
7. **Do not delete or modify `towgrade.html`** — it's the reference prototype and the demo asset. Build alongside it, not on top of it.

---

*Last updated: April 28, 2026*
*Owner: project lead (sole founder)*
