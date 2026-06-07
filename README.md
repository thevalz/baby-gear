# Baby-Gear Trade Study

A local, persistent, modular **trade-study dashboard** for baby-gear decisions
(car seat, stroller, …). Each gear category is a *module* with weighted
criteria and scored options; the app computes weighted scores live, persists
everything, and rolls it all up into a **Main Summary Dashboard**.

## Run

No dependencies, no build step, no `npm install`:

```bash
node server.js
# → http://localhost:3000
```

On first run it seeds `data/state.json` from `data/seed.json`. All edits are
saved back to `data/state.json` (with a `localStorage` fallback if the server
is offline), so they survive a page refresh.

## Features

Each **module** (Car Seat, Stroller, …) has:
- **Criteria** with integer weights (1–5) you can add/edit/remove.
- **Options** (rows) with a price, per-criterion **scores** (1–5), attributes,
  compatibility, and notes.
- Live **weighted total** = Σ(weight × score), **max** = 5 × Σ(weights), and
  **percent**. The top pick (max weighted total) is starred.

The **Main Summary Dashboard** surfaces the four required rollups:
1. **Top pick per category.**
2. **Total cost vs. budget** — each module's selected pick + adapter cost,
   against the per-module budget and the overall budget. Pick selection
   defaults to the top pick but can be overridden per module.
3. **Compatibility flags** — cross-module conflicts (e.g. a car seat that fits
   only one of the strollers you're considering, native vs. adapter fit, and
   incompatibilities).
4. **Keep/return decisions** — inventory with status + refund, and
   **Net Spend = Σ(new purchases) − Σ(refunds)**.

## Data model

```
Criterion     { id, label, weight (1–5) }
Option        { id, moduleId, name, price, attributes {…}, scores { criterionId: 1–5 }, notes }
Module        { id, label, budget, selectedOptionId, criteria[], options[] }
InventoryItem { id, name, moduleId, status: keep|return|undecided, refund, notes }
Config        { overallBudget, adapterCost }
```

### Compatibility & adapters
An option's `attributes.fits` maps another option's id to `"native"` or
`"adapter"`. An adapter adds `config.adapterCost` (~$100 — BOB sells
brand-specific adapters) to the effective cost of the selected pick that needs
it. Edit fit relationships under each option's **Attributes & compatibility**.

> The Cybex Cloud G carrier weight is marked `carrierLbVerify` in the seed —
> the dashboard raises a reminder to confirm it before relying on it.

## Persistence & data portability
- **Server** (default): `GET/PUT /api/state` reads/writes `data/state.json`;
  `POST /api/reset` re-seeds from `data/seed.json`.
- **Export / Import JSON** buttons move the full state in and out as a file.
- **Reset to seed** restores the original seed data.
