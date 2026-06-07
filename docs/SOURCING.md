# Pricing & Image Sourcing — architecture and session guide

The app has **no backend and does no live scraping**. Instead:

```
┌─────────────────────┐   research + commit    ┌──────────────────────┐   git push    ┌─────────────────┐
│  Claude "sourcing"  │ ─────────────────────▶ │  repo (seed.json +   │ ────────────▶ │  GitHub Pages   │
│      session        │   prices, sources,     │  public/images/…)    │   CI deploy   │  static app     │
│  (the "engine")     │   product images       │  = source of truth   │               │  (reads data)   │
└─────────────────────┘                        └──────────────────────┘               └─────────────────┘
                                                                                                │
                                                                            visitor's localStorage working copy
                                                                            (scores/budgets) is preserved;
                                                                            new prices/images fold in by dataVersion
```

The **pricing engine is a Claude session**. It scours the web for current
prices and a product image, writes them into the repo, bumps a version number,
and commits. The deployed app reads that committed data; the next time a visitor
loads the page, the new prices/images fold into their saved working copy without
wiping the scores and weights they entered (see [`src/lib/sync.ts`](../src/lib/sync.ts)).

---

## The data contract

Per-product pricing lives on each `Option` in
[`src/data/seed.json`](../src/data/seed.json). The relevant fields
(full types in [`src/lib/types.ts`](../src/lib/types.ts)):

```jsonc
{
  "id": "nuna-pipa-aire-rx",          // stable id — also the image filename
  "name": "Nuna Pipa Aire RX",
  "price": 380,                        // reference/MSRP fallback (kept)
  "image": "images/nuna-pipa-aire-rx.jpg",   // repo-relative, under public/
  "priceSources": [                    // ← what a sourcing session fills in
    {
      "retailer": "Amazon",
      "price": 349.95,
      "url": "https://www.amazon.com/dp/…",
      "inStock": true,                 // optional; defaults to true
      "checkedAt": "2026-06-07"        // ISO date you sourced it
    },
    { "retailer": "Target", "price": 379.99, "url": "https://www.target.com/…", "checkedAt": "2026-06-07" }
  ]
}
```

Rules:

- The app shows the **lowest in-stock** `priceSources` price as the "best
  price" (`bestPrice()` in [`src/lib/scoring.ts`](../src/lib/scoring.ts)); it
  falls back to `price` when there are no usable sources.
- Always include a real, deep-linked `url` and the `checkedAt` date — the UI
  renders each source as a dated link, so prices are auditable.
- Mark `"inStock": false` rather than deleting a sold-out listing if it's still
  a useful reference.
- Leave `price` as a sane MSRP fallback; don't remove it.

## Images

See [`public/images/README.md`](../public/images/README.md). In short:
download the product shot into `public/images/<id>.<ext>`, keep it ~400–800px
and optimized, and set the option's `image` to `"images/<id>.<ext>"`.

## The `dataVersion` bump (important)

After you finish a sourcing pass, **increment the top-level `dataVersion`** in
`seed.json` (e.g. `1 → 2`). This is the signal the deployed app uses to fold
fresh prices/images into returning visitors' localStorage. If you forget to bump
it, existing visitors keep seeing their cached prices until they hit
**"Refresh prices"** or **Reset**.

---

## Sourcing-session checklist

1. Pull the branch and read the current `seed.json`.
2. For each option you're refreshing:
   - Web-search 2–4 reputable retailers for the current price.
   - Record each as a `priceSources` entry (retailer, price, deep URL, date,
     in-stock).
   - Download a clean product image to `public/images/<id>.<ext>` and set
     `image`.
3. Bump `dataVersion`.
4. Verify: `npm run build` (typecheck + build) and `npm test` must pass.
5. Commit with a clear message (e.g. `Source car-seat prices + images (2026-06)`)
   and push.

### Copy-paste prompt for a sourcing session

> You are a pricing-sourcing session for the baby-gear app. Read
> `docs/SOURCING.md` and `src/data/seed.json`. For every option in the
> **<MODULE>** module, web-search 2–4 major US retailers for the current price
> and fill in `priceSources` (retailer, price, deep-linked url, today's date,
> inStock). Download a clean product image to `public/images/<option-id>.<ext>`
> and set the option's `image` field. Do not change scores, weights, criteria,
> or budgets. When done, bump the top-level `dataVersion`, run `npm run build`
> and `npm test`, then commit and push.
