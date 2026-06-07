# Baby-Gear Trade Study

A modular **trade-study dashboard** for baby-gear decisions (car seat,
stroller, …). Each gear category is a *module* with weighted criteria and
scored options; the app computes weighted scores and rolls everything up into a
**Summary** view. Options carry **product images** and **best-price data**
sourced from across the web.

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**, charts
via **recharts**. Deployed as a static site to **GitHub Pages**.

## Customer-facing mode (creator advisor)

On top of the trade-study engine, the app ships a **customer-facing layer** so a
baby-gear **creator/influencer** can embed it as a branded advisor that turns
viewers into confident buyers (and clicks into their channel + affiliate links):

- **First-run onboarding** (`components/Onboarding.tsx`) — a short, branded quiz
  (budget, what-matters-most priorities, car, back-seat length, owned stroller).
  It *derives the criteria weights* from plain-language answers
  (`lib/preferences.ts`), so a new parent never sees a wall of sliders. Gated by
  a per-visitor `preferences.completed` flag in the store.
- **"Recommended for you" hero** (`components/RecommendationHero.tsx`) — one
  confident, explained pick per module at the top of the Summary, with a one-line
  *why* (built from the top-contributing criteria + evidence), best price as an
  affiliate link, and a "Watch my review" CTA.
- **Creator branding** (`config.creator`, `components/CreatorBanner.tsx`) — name,
  tagline, "Watch reviews" / "Subscribe" CTAs. Lives in `config` so it travels
  through export/import and repo sync.
- **Back-seat clearance check** (`lib/clearance.ts`) — compares each seat's
  `rearFacingLengthIn` footprint against the parent's measured back-seat length
  (with a safety margin and a measuring note) to flag fit problems *before*
  purchase. An acknowledged approximation — final fit depends on the install.
- **Critic score, Rotten-Tomatoes style** (`lib/endorsements.ts`) — options carry
  `endorsements[]` (one per creator: verdict, optional score, quote, link) that
  aggregate into a "% of creators recommend" badge shown next to the spec-driven
  match score, with the host creator's pull-quote on the hero.

These are additive: the original editable trade-study workspace is unchanged and
still reachable below the hero ("The full breakdown").

## Pricing engine & images

There is **no backend and no live scraping**. The "engine" that finds best
pricing is a **Claude session**: it researches current retailer prices, records
them with sources, downloads product images into the repo, and commits. The
deployed app reads that committed data. Each option holds a `priceSources[]`
list (retailer, price, deep link, date) — the app shows the lowest in-stock
price as the **best price** and renders every source as a dated link — plus a
local `image` path under `public/images/`.

See **[`docs/SOURCING.md`](docs/SOURCING.md)** for the full architecture, the
data contract, and the prompt to run a sourcing session.

## Run

```bash
npm install
npm run dev      # → http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck + production build to dist/ (base path /family/)
npm run preview  # serve the production build
npm test         # run the vitest unit tests
```

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds the app and publishes `dist/` to GitHub
Pages on every push to `main`. The Vite `base` is `/family/` to match the
project-pages URL `https://<owner>.github.io/family/` (override via `VITE_BASE`,
or rename in `vite.config.ts` if the repo is renamed).

**One-time setup:** in repo **Settings → Pages → Build and deployment**, set the
**Source** to **GitHub Actions**.

## Project structure

```
index.html              Vite entry
src/
  main.tsx              React bootstrap
  App.tsx              App shell: sidebar + toolbar + swapping content pane
  index.css            Tailwind entry (@import "tailwindcss")
  components/
    Sidebar.tsx        Left nav: "Summary" + one item per module
    Toolbar.tsx        Overall budget + Export / Import / Reset
    SummaryDashboard.tsx  Four cards: top picks, cost vs budget,
                          compatibility flags, keep/return tracker
    CompatibilityView.tsx Browsable cross-product fit matrix (seat × stroller)
    ModuleView.tsx     Editable module: label/budget, criteria + weights,
                       options with prices & scores, weighted-score chart
  lib/
    types.ts           Data model (Config / Module / Option / PriceSource / Criterion / InventoryItem)
    scoring.ts         weightedTotal / maxScore / percent / topPick / bestPrice / bestSource
    ranking.ts         Rank-order + percentile across the field (overall & per-criterion)
    tags.ts            Material/certification tag labels + module tag list + filter
    compatibility.ts   Data-driven cross-module compatibility map + flag engine
    sync.ts            Repo-as-source-of-truth pricing merge (dataVersion)
    assets.ts          Base-path-aware asset URL helper (for images)
    store.ts           Zustand store + persist (localStorage)
  data/
    seed.json          Seed data (Infant Car Seat + Stroller modules) — source of truth
public/
  images/              Product images committed to the repo (see its README)
docs/
  SOURCING.md          How a Claude session sources prices/images into the repo
.github/workflows/
  deploy.yml           Build + deploy to GitHub Pages
```

## Data model

```
Criterion     { id, label, weight (1–5) }
PriceSource   { retailer, price, url, inStock?, checkedAt (ISO date) }
Option        { id, moduleId, name, price, image?, priceSources?[], endorsements?[], tags?[], attributes {…}, scores { criterionId: 1–5 }, notes }
Module        { id, label, budget, selectedOptionId, criteria[], options[] }
InventoryItem { id, name, moduleId, status: keep|return|undecided, refund, notes }
Config        { overallBudget, adapterCost }
AppState      { dataVersion?, config, modules[], inventory[] }
```

## Compatibility

`src/lib/compatibility.ts` holds a **data-driven** `compatibilityMap` of
cross-module relations. Each relation names a source module (whose selected pick
is evaluated), a target module, and a list of targets matched by name substring
with the boolean attribute that signals fit. The engine then compares the pick
against the strollers you **own** (inventory `keep`) or **consider** (target
options / `undecided` inventory) and emits flags:

- 🔴 **red** — pick doesn't fit something you own (e.g. *"Selected seat doesn't
  fit your Wayfinder — needs Alterrain."*)
- 🟡 **yellow** — pick won't fit something you're only considering
- 🟢 **green** — pick fits everything you own or consider

Add a new relationship by appending an entry to `compatibilityMap` — no engine
changes required.

### Browsable fit matrix

The flags above answer "does *my* pick fit *my* gear." The **Fit & compatibility**
view (`components/CompatibilityView.tsx`) exposes the *whole grid* — every source
option × every target option (e.g. every car seat × every stroller) — so you can
see the tradeoffs *between* products before committing to either. Each cell is
✓ fits / ✗ doesn't / – not-yet-sourced; rows are ordered by overall rank, the
stroller you own is highlighted, and every product links to its drill-down.
`compatibilityMatrix()` / `compatibilityMatrices()` in `lib/compatibility.ts`
build the grid from the same `compatibilityMap`, so a new relationship shows up
here automatically too.

## Scoring

The weighted total is the engine, but a bare index (`106/120`) is opaque — it
doesn't tell you whether that's best-in-class or middle of the pack. So the app
**leads with rank-order / percentile across the whole field** and keeps the
index as a secondary "match" number.

- `weightedTotal(option)` = Σ over criteria of `weight × score`
- `maxScore(module)` = `5 × Σ(weights)`
- `percent` = `weightedTotal / maxScore`
- Top pick per module = option with the max weighted total

### Rank & percentile (`src/lib/ranking.ts`)

- `overallRanks(module)` — every option's standing by weighted total, as
  `{ rank, of, percentile }` (competition ranking: ties share the lower rank).
- `criterionRanks(module, criterionId)` / `allCriterionRanks(module)` — the same
  standing **per criterion**, so the drill-down can say "Safety: **#1 of 15**"
  and you see *which dimensions* a product leads or lags on, not just a total.
- `percentile` runs 100 (best/tied-best) → 0 (worst); `rankTier` buckets it into
  top / mid / weak for colour-coding.

The comparison table sorts by rank by default and shows a per-row rank badge;
the drill-down pairs each criterion's rank with the literal fact behind it
(`criterionEvidence`) — that's the "what drives the score" view.

### Tags (`src/lib/tags.ts`)

Options carry `tags[]` — material / certification facets like
`flame-retardant-free`, `greenguard-gold`, `non-toxic`, `merino-wool` — the
things "MAHA" parents shop for specifically. The comparison view renders them as
chips and offers an **AND-combined tag filter + name search** so the database is
navigable. Tags are sourced (with citations) like prices; coverage starts
partial and a sourcing pass expands it.

## Persistence

A global **Zustand** store (`src/lib/store.ts`) loads `src/data/seed.json` on
first run, then persists the entire state (`config`, `modules`, `inventory`) to
`localStorage` under the key `baby-gear-state` on every change and rehydrates
from it on reload — so edits survive a full page refresh.

The toolbar provides:
- **Refresh prices** — folds the repo's latest committed prices/images into your
  working copy *without* discarding your scores/weights/budgets.
- **Export** — downloads the current state as `data.json`.
- **Import** — loads a `data.json` file and replaces the state.
- **Reset** — restores the original seed data.

### Repo as source of truth

`seed.json` carries a top-level `dataVersion`. When a sourcing session commits
new prices and bumps `dataVersion`, the deployed app detects the newer version
on load and merges the fresh **pricing fields only** (`price`, `image`,
`priceSources`) into each returning visitor's saved state, preserving their
scores. The **Refresh prices** button forces the same merge on demand. Logic
lives in `src/lib/sync.ts` (unit-tested in `sync.test.ts`).

## Adding gear categories at runtime

Click **“+ Add module”** in the sidebar to create a new category (crib,
monitor, carrier, …) with no code changes: edit its label and budget, add
criteria with weights, and add options with prices and scores — all inline in
the module view. The sidebar nav and the Summary Dashboard pick up new modules
automatically because every view iterates `state.modules`.
