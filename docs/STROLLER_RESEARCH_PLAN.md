# Stroller Sourcing & Validation — Research Plan

**Goal.** Bring the `stroller` module up to the same evidentiary bar as the
15 infant car seats: source current US pricing + a product image for every
stroller option, verify the headline specs, and surface the **decision-relevant
attributes** in the comparison table (not just bare placeholder scores).

Read this with [`SOURCING.md`](SOURCING.md) (the data contract) and
[`RESEARCH_PLAN.md`](RESEARCH_PLAN.md) (the car-seat effort it mirrors). Same
fragment → integration model, same data-quality rules.

---

## Why this exists

The car seats were fully sourced (prices, images, verified `attributes`,
re-scored). The strollers were left as **placeholders** — all scores `3`,
no `priceSources`, no images, and only `brand`/`type`/`owned` attributes. So
the comparison table showed nothing to *justify* a stroller pick. This plan
applies the car-seat rigor to the strollers.

## The roster (3 strollers — all BOB single joggers)

| Option id | Model | Owned? | Status |
|-----------|-------|:------:|--------|
| `bob-wayfinder-opt` | BOB Wayfinder | ✅ owned | In stock (~$680) |
| `bob-alterrain-opt` | BOB Alterrain | considering | Largely **sold out** / superseded by the Pro (MSRP ~$550) |
| `bob-alterrain-pro-opt` | BOB Alterrain Pro | considering | In stock (~$830, **over the $800 budget**) |

> The base **Alterrain** and the **Alterrain Pro** share the *same*
> brand-specific car-seat adapter ecosystem, so every car seat flagged
> `fitsAlterrain` fits both. The `Alterrain` substring in
> [`compatibility.ts`](../src/lib/compatibility.ts) already covers both.

## Key attributes surfaced in the summary table

The stroller criteria are **Ride / terrain (×5)**, **Weight & fold size (×3)**,
**Car-seat adapter ease (×3)**, **Price (×2)**. We surface one validated,
high-signal fact per criterion as a chip (full specs live on the drill-down):

| Attribute (`seed.json`) | Criterion it backs | Table chip |
|-------------------------|--------------------|------------|
| `suspension` (+ `tires` on detail) | Ride / terrain | e.g. `Independent dual` |
| `weightLb` (+ `foldedDimsIn` on detail) | Weight & fold size | e.g. `31.1 lb` |
| `adapterSystem` | Car-seat adapter ease | `1 universal adapter` (good) vs `Brand adapters` |
| `priceSources` → best in-stock | Price | best-price cell |
| `maxChildLb` | (capacity context) | drill-down fact |

`suspension`, `weightLb`, `foldedDimsIn`, `tires`, `maxChildLb`, and
`adapterSystem` were added to `OptionAttributes`
([`types.ts`](../src/lib/types.ts)) and rendered by
[`evidence.ts`](../src/lib/evidence.ts) (`optionSummary` chips, `optionFacts`
labels, and `criterionEvidence` so each score shows the literal value behind
it).

## Scoring rubric (0–5, applied consistently)

| | Ride ×5 | Fold/weight ×3 | Adapter ease ×3 | Price ×2 | Weighted /65 |
|--|:--:|:--:|:--:|:--:|:--:|
| **Wayfinder** (owned) | 4 — dual suspension | 4 — lightest 31.1 lb, wheels-tuck fold | 5 — one universal adapter | 3 — ~$680 | **53 (82%)** |
| **Alterrain** | 4 — SmoothShox | 3 — folds long/bulky | 4 — brand adapters, broader reach | 4 — cheapest ~$550 | **49 (75%)** |
| **Alterrain Pro** | 5 — SmoothShox + hand brake | 3 — flattest fold but heaviest 32.3 lb | 4 — brand adapters | 2 — ~$830, over budget | **50 (77%)** |

Net: the **owned Wayfinder** leads (cheapest already-paid option + simplest
adapter); the **Pro** edges the base Alterrain on ride but loses on price/budget.

## Sourcing pattern (mirrors the car-seat effort)

1. Per stroller, web-search 2–4 US retailers for current price → `priceSources`
   (retailer, price, deep link, `inStock`, `checkedAt`). Mark sold-out/backorder
   listings `inStock: false` rather than dropping them.
2. Download a clean product shot to `public/images/<option-id>.<ext>`
   (~400–800px, optimized); set `image`.
3. Write the audit fragment `docs/research/strollers/<option-id>.json` from
   [`_TEMPLATE.json`](research/strollers/_TEMPLATE.json) with verified specs +
   source URLs.
4. Integration: fold fragments into `seed.json`'s `stroller` module, re-score,
   bump `dataVersion` once, `npm run build` + `npm test`, commit.

## Data-quality notes captured this pass

- **Wayfinder** best in-stock $679.99 (ANB Baby). Target's $543.99 was a sale
  price but out of stock; Strolleria/Swaddles list $679.99 backordered/sold out.
- **Alterrain (base)** is being phased out — no in-stock listing found; only
  live listing (ANB Baby, $649.99) was *Not Available*. `price` is the $549.99
  MSRP fallback.
- **Alterrain Pro** in stock at $829.99 (Bambi Baby / Strolleria), $879.99
  (Modern Nursery) — flagged as over the $800 module budget.
