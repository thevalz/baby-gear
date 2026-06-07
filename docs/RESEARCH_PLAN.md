# Car-Seat Sourcing — Parallel Research Plan

**Goal.** Source current US pricing + a product image for every infant car seat
in the `car-seat` module, and verify each one's facts (carrier weight, **Toyota
Tacoma** rear-facing fit, **BOB Wayfinder / Alterrain** adapter compatibility,
headline safety). The roster was just expanded from **5 → 15** options (stubs
already committed to [`src/data/seed.json`](../src/data/seed.json)).

This is designed to run as **parallel Claude sessions** without git conflicts.
Read this with [`SOURCING.md`](SOURCING.md) (the data contract) — this doc adds
the *parallelization* layer on top of it.

---

## The conflict-free model (read this first)

The naïve approach — every session edits `seed.json` and bumps `dataVersion` —
**guarantees merge conflicts** (same array, same version int). So we don't do
that. Instead:

```
  parallel sourcing sessions                       one serial integration pass
  ──────────────────────────                       ───────────────────────────
  Batch A ─┐  writes docs/research/car-seats/<id>.json   ┐
  Batch B ─┤  + public/images/<id>.<ext>                 │  reads ALL fragments
  Batch C ─┼─ (its own NEW files only, never seed.json) ─┼─ folds into seed.json
  Batch D ─┤  commits to its own branch                  │  sets scores
  Batch E ─┘                                             ┘  bumps dataVersion ×1
                                                            build + test + push
```

**Rules that keep it conflict-free**

1. A sourcing session **never edits `src/data/seed.json`** and **never touches
   `dataVersion`**. It only *creates* files whose names contain its own option
   ids — so two sessions can never write the same path.
2. Each session writes one **staging fragment** per seat:
   `docs/research/car-seats/<option-id>.json` (schema:
   [`_TEMPLATE.json`](research/car-seats/_TEMPLATE.json)).
3. Each session downloads images to `public/images/<option-id>.<ext>` (disjoint
   filenames → no conflict).
4. Each session works on its **own branch**
   (`claude/source-carseats-batch-<X>`) off
   `claude/baby-gear-car-seat-research-ZkFet`, and commits only its new files.
5. The **integration pass** (one session, run last) folds every fragment into
   `seed.json`, sets/refreshes scores, bumps `dataVersion` **once**, runs
   `npm run build` + `npm test`, and pushes.

> Why fragments instead of just letting each session edit its own options in
> `seed.json`? JSON array edits to the same file still three-way-conflict, and
> two sessions bumping `dataVersion` collide every time. Fragments sidestep both
> and double as an auditable research trail.

---

## The roster (15 seats, grouped into 5 batches)

Compatibility below reflects the BOB adapter finders / retailer fitment lists
(Strolleria) as of 2026-06 — **treat it as a hypothesis each session confirms**,
not gospel. The two BOB strollers use *different* adapter ecosystems:

- **Wayfinder** → one *universal* adapter for **Nuna / Cybex / Maxi-Cosi /
  Britax(Willow) / Diono** infant seats.
- **Alterrain** → **Britax/BOB native** + brand adapters for **Graco, Chicco,
  UPPAbaby, Peg-Perego, Diono, Nuna, Cybex, Maxi-Cosi**.

| # | Option id | Model | Wayfinder | Alterrain | Batch |
|---|-----------|-------|:---------:|:---------:|:-----:|
| 1 | `nuna-pipa-aire-rx` | Nuna Pipa Aire RX | ✅ | ✅ | A |
| 2 | `cybex-aton-g` | Cybex Aton G Swivel | ✅ | ✅ | A |
| 3 | `maxi-cosi-mico-luxe` | Maxi-Cosi Mico Luxe | ✅ | ✅ | A |
| 4 | `britax-b-safe-gen2` | Britax B-Safe Gen2 | ✅ | ✅ (native) | B |
| 5 | `britax-willow-brook-s` | Britax Willow Brook S+ | ✅ | ✅ (native) | B |
| 6 | `diono-liteclik-30` | Diono LiteClik 30 SafePlus | ✅ | ✅ | B |
| 7 | `graco-snugride-35-lite-lx` | Graco SnugRide 35 Lite LX | ❌ | ⚠️ verify | C |
| 8 | `graco-snugride-snugfit-35-dlx` | Graco SnugRide SnugFit 35 DLX | ❌ | ⚠️ verify | C |
| 9 | `chicco-keyfit-35` | Chicco KeyFit 35 | ❌ | ⚠️ **see flag** | C |
| 10 | `chicco-fit2` | Chicco Fit2 (RF 2-Year) | ❌ | ✅ | D |
| 11 | `uppababy-mesa-v2` | UPPAbaby Mesa V2 | ❌ | ✅ | D |
| 12 | `peg-perego-primo-viaggio-4-35-nido` | Peg Perego Primo Viaggio 4-35 Nido | ❌ | ✅ | D |
| 13 | `clek-liing` | Clek Liing | ⚠️ likely ❌ | ⚠️ likely ❌ | E |
| 14 | `cybex-cloud-g-lux` | Cybex Cloud G Lux | ⚠️ verify | ⚠️ verify | E |
| 15 | `doona-car-seat-stroller` | Doona Car Seat & Stroller | N/A | N/A | E |

### Open verification flags (resolve during sourcing / integration)

- **🚩 Chicco KeyFit 35 — Alterrain.** The current stub says `fitsAlterrain:
  false`, but the 2026 Strolleria Alterrain fitment list *names* KeyFit 35. If
  confirmed, this flips a weighted-`compat` fact and should raise its `compat`
  score. Confirm against bobgear.com's adapter finder, then flag for the
  integration pass.
- **Graco Lite LX vs SnugFit on the Alterrain Graco adapter.** BOB's Graco
  adapter targets *Click Connect / Classic Connect* seats. Confirm the
  stay-in-car-base **Lite LX** and the **SnugFit 35 DLX** actually latch into
  it (vs. base-only LATCH installs that don't click to the adapter).
- **Cybex Cloud G vs Cloud Q on the BOB Cybex adapter.** Lists name *Cloud Q*;
  confirm Cloud G uses the same adapter.
- **Clek Liing.** Not on either BOB list — confirm there is genuinely no BOB
  adapter (Clek typically isn't BOB-compatible). It's here for its
  best-in-class **Tacoma fit**, not stroller compat.
- **Doona.** It *is* its own stroller, so BOB compat is N/A; note it competes
  with the **stroller** module, not just the car-seat one.

---

## Batch assignments

Each batch is ~3 seats grouped by overlapping research (shared brand DTC pages,
shared adapter questions). Run all five in parallel; they share no files.

| Batch | Branch | Seats |
|-------|--------|-------|
| **A — Premium light, both-stroller** | `claude/source-carseats-batch-a` | `nuna-pipa-aire-rx`, `cybex-aton-g`, `maxi-cosi-mico-luxe` |
| **B — Britax/Diono (universal + native)** | `claude/source-carseats-batch-b` | `britax-b-safe-gen2`, `britax-willow-brook-s`, `diono-liteclik-30` |
| **C — Budget + Graco/Chicco workhorses** | `claude/source-carseats-batch-c` | `graco-snugride-35-lite-lx`, `graco-snugride-snugfit-35-dlx`, `chicco-keyfit-35` |
| **D — Extended RF, Alterrain-only** | `claude/source-carseats-batch-d` | `chicco-fit2`, `uppababy-mesa-v2`, `peg-perego-primo-viaggio-4-35-nido` |
| **E — Compact & wildcards** | `claude/source-carseats-batch-e` | `clek-liing`, `cybex-cloud-g-lux`, `doona-car-seat-stroller` |

---

## Per-session task — copy-paste prompt

> You are a **car-seat sourcing session** for the baby-gear app. Read
> `docs/RESEARCH_PLAN.md`, `docs/SOURCING.md`, and
> `docs/research/car-seats/_TEMPLATE.json`. You are assigned **Batch <X>**:
> option ids **`<id1>`, `<id2>`, `<id3>`**.
>
> Create and check out branch `claude/source-carseats-batch-<x>` off
> `claude/baby-gear-car-seat-research-ZkFet`.
>
> For **each** assigned id (and ONLY these), do all of the following:
> 1. **Price** — web-search 2–4 major US retailers (Amazon, Target, Walmart,
>    buybuy Baby/Babylist, the brand's own DTC store, Strolleria/Albee Baby/
>    Pottery Barn Kids). Record each as a price source: retailer, current price,
>    **deep link** to the product page, `inStock`, today's date. Mark sold-out
>    listings `inStock: false` rather than dropping them.
> 2. **Verify the facts** — carrier-only weight (lb), BOB **Wayfinder** and
>    **Alterrain** adapter compatibility (name the adapter + its price, or
>    confirm "none"/"native"), headline safety features, and any data on
>    **Toyota Tacoma rear-facing fit** (shell length / footprint / 3-across /
>    CPST notes — or record "no direct data found"). Resolve any 🚩 flag in the
>    plan that touches your seats.
> 3. **Image** — download one clean product shot to
>    `public/images/<id>.<ext>` (~400–800px, optimized).
> 4. **Write the fragment** — copy `_TEMPLATE.json` to
>    `docs/research/car-seats/<id>.json` and fill every field.
>
> **Do NOT edit `src/data/seed.json`, `dataVersion`, scores, weights, criteria,
> or budgets, and do NOT touch any file outside your own `<id>` fragments and
> images.** Commit your new files to your batch branch and push
> (`git push -u origin <branch>`). Report a one-line price summary per seat.
> Do **not** open a PR.

---

## Integration pass — copy-paste prompt (run last, single session)

> You are the **integration pass** for the car-seat sourcing effort. All batch
> branches have pushed staging fragments under `docs/research/car-seats/` and
> images under `public/images/`. On `claude/baby-gear-car-seat-research-ZkFet`:
> 1. Gather every `docs/research/car-seats/<id>.json` fragment (merge the batch
>    branches in, or cherry-pick their files).
> 2. For each option in `seed.json`'s `car-seat` module, fold in the fragment's
>    `priceSources`, `image`, and verified `attributes` (`carrierLb`,
>    `fitsWayfinder`, `fitsAlterrain`, `safety`). Apply the verification flags
>    (e.g. KeyFit 35 Alterrain compat) and **re-score** `fit`, `weight`,
>    `compat`, `safety`, `price` consistently across all 15 options using the
>    verified facts. Keep `price` as an MSRP fallback per `SOURCING.md`.
> 3. Bump the top-level `dataVersion` **once** (2 → 3).
> 4. Run `npm run build` and `npm test` — both must pass.
> 5. Commit (`Source 15 car-seat prices + images + verified fit/compat`) and
>    push. Open a PR only if asked.

---

## Data-quality rules (from `SOURCING.md`)

- Lowest **in-stock** `priceSources` entry becomes the app's "best price";
  always include a real **deep link** + `checkedAt` date so prices are
  auditable.
- Mark sold-out listings `inStock: false` instead of deleting them.
- Keep each option's `price` as a sane MSRP fallback; never remove it.
- Images: `public/images/<id>.<ext>`, ~400–800px, optimized; set
  `image: "images/<id>.<ext>"`.

## Status tracker

Update as batches land (✅ done · 🟡 in progress · ⬜ not started).

| Batch | Sourced | Fragments committed | Folded into seed |
|-------|:-------:|:-------------------:|:----------------:|
| A | ⬜ | ⬜ | ⬜ |
| B | ⬜ | ⬜ | ⬜ |
| C | ⬜ | ⬜ | ⬜ |
| D | ⬜ | ⬜ | ⬜ |
| E | ⬜ | ⬜ | ⬜ |
| **Integration** | — | — | ⬜ |
