# Baby-Gear — Sourced Facts for Parents

An **independent, information-only** reference site for baby-gear decisions.
Three categories — **Infant Car Seats**, **Strollers**, and the **Car-Seat
Stroller Adapters** between them — each shown as a plain comparison table of
**literal, sourced facts**: weight, folded/unfolded dimensions, brake, capacity,
safety standards, compatibility, and **best-price data** with dated retailer
links. Open any item for its full spec sheet and sources.

**No scores, no rankings, no sponsorships.** The site presents facts and links
to where each one came from; it never tells you what to buy.

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**. Deployed
as a static site to **GitHub Pages**.

## Self-maintained via AI workflows

There is **no backend and no live scraping**. The site's data is kept current by
**Claude sourcing sessions**: an AI workflow researches current retailer prices
and manufacturer specs, records each fact with its source link, downloads product
images into the repo, and commits. The deployed static app reads that committed
data. Each option holds a `priceSources[]` list (retailer, price, deep link,
date) and factual `attributes` — every value traceable to a published source.

The research kit that drives this lives under `docs/` — see
**[`docs/SOURCING.md`](docs/SOURCING.md)** for the data contract and the
per-session prompt, and `docs/CLEK_COMPAT_RESEARCH_PLAN.md` for the
stroller/adapter sourcing effort.

> Note: the scoring/ranking engine from earlier versions (`lib/scoring.ts`,
> criteria weights, endorsements) still exists in `src/lib` and stays unit-tested,
> but it is **no longer surfaced anywhere in the UI**. The app is purely
> informational.

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
npm run build    # typecheck + production build to dist/ (base path /baby-gear/)
npm run preview  # serve the production build
npm test         # run the vitest unit tests
```

## Deployment (GitHub Pages)

`.github/workflows/deploy.yml` builds the app and publishes `dist/` to GitHub
Pages on every push to `main`. The Vite `base` is `/baby-gear/` to match the
project-pages URL `https://<owner>.github.io/baby-gear/` (override via
`VITE_BASE`, or rename in `vite.config.ts` if the repo is renamed).

**One-time setup:** in repo **Settings → Pages → Build and deployment**, set the
**Source** to **GitHub Actions**.

## Project structure

```
index.html              Vite entry
src/
  main.tsx              React bootstrap
  App.tsx              Grid-first shell: minimal header + nav drawer, swapping content pane
  index.css            Tailwind entry (@import "tailwindcss")
  components/
    TopBar.tsx         Minimal header: hamburger + brand + data-tools overflow (refresh/export/import/reset)
    NavDrawer.tsx      Off-canvas nav: one item per module + "Add module"
    CompareView.tsx    The landing: module tabs + saved-view tabs over a single
                       full-bleed comparison grid; Objectives popover + Insights modal
    ComparisonMatrix.tsx  The grid: options × real-value columns, heat + fail flags,
                          row-click scrollable value-breakdown popover
    ModuleView.tsx     Editable module: label/budget, criteria + weights,
                       options with prices & scores, weighted-score chart
  lib/
    types.ts           Data model (Config / Module / Option / PriceSource / Criterion / InventoryItem)
    scoring.ts         weightedTotal / maxScore / percent / topPick / bestPrice / bestSource
    savedViews.ts      Tier-2 saved-view filters (All / Under budget / Fits my car / Top N)
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
Option        { id, moduleId, name, price, image?, priceSources?[], attributes {…}, scores { criterionId: 1–5 }, notes }
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

## Scoring

- `weightedTotal(option)` = Σ over criteria of `weight × score`
- `maxScore(module)` = `5 × Σ(weights)`
- `percent` = `weightedTotal / maxScore`
- Top pick per module = option with the max weighted total

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
