# Baby-Gear Trade Study

A local, modular **trade-study dashboard** for baby-gear decisions (car seat,
stroller, …). Each gear category is a *module* with weighted criteria and
scored options; the app computes weighted scores and rolls everything up into a
**Summary** view.

Built with **Vite + React + TypeScript**, styled with **Tailwind CSS**, charts
via **recharts**.

## Run

```bash
npm install
npm run dev      # → http://localhost:5173
```

Other scripts:

```bash
npm run build    # typecheck + production build to dist/
npm run preview  # serve the production build
```

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
    SummaryView.tsx    Top picks, cost vs. budget, net spend, chart
    ModuleView.tsx     Per-module options table + weighted-score chart
  lib/
    types.ts           Data model (Config / Module / Option / Criterion / InventoryItem)
    scoring.ts         weightedTotal / maxScore / percent / topPick
    store.ts           Zustand store + persist (localStorage)
  data/
    seed.json          Seed data (Infant Car Seat + Stroller modules)
```

## Data model

```
Criterion     { id, label, weight (1–5) }
Option        { id, moduleId, name, price, attributes {…}, scores { criterionId: 1–5 }, notes }
Module        { id, label, budget, selectedOptionId, criteria[], options[] }
InventoryItem { id, name, moduleId, status: keep|return|undecided, refund, notes }
Config        { overallBudget, adapterCost }
```

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
- **Export** — downloads the current state as `data.json`.
- **Import** — loads a `data.json` file and replaces the state.
- **Reset** — restores the original seed data.
