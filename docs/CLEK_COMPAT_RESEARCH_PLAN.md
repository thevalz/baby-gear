# Clek Liing → Compatible Strollers & Adapters — Full Research Plan

**Context.** We **own** the **Clek Liing** infant car seat and the **BOB
Alterrain Pro** stroller (trail / jogging / extended-trip). We now want to
catalog the **entire universe of strollers the Clek Liing is compatible with**,
plus **the adapter each one needs**, at the study's full evidentiary bar. The
driving personal objective remains finding a **lighter, smaller, more portable**
city/shopping stroller — but the roster is **the complete Clek list, not a
shortlist**.

**Goal.** Stand up **two new modules** and source detailed, **fully-cited**
product data for every item:

1. **`clek-stroller` module** — **all 80 strollers** on Clek's official list.
2. **`adapter` module** — the **58 distinct car-seat adapters** that connect the
   Liing/Liingo to those strollers (deduped by SKU).

The definitive roster gate is Clek's own list
([`docs/research/clek-strollers/_CLEK_LIST.md`](research/clek-strollers/_CLEK_LIST.md),
transcribed verbatim from Clek's support article). **Nothing is dropped.**

Read this with [`SOURCING.md`](SOURCING.md) (the data contract) and
[`RESEARCH_PLAN.md`](RESEARCH_PLAN.md) (the 15-car-seat parallel effort this
mirrors). Same fragment → integration model, same data-quality rules.

---

## 1. The definitive source (roster gate)

- **Source of record:** Clek Support — "What strollers are compatible with Liing
  and Liingo?"
  <https://support.clekinc.com/hc/en-us/articles/360039384292-What-strollers-are-compatible-with-Liing-and-Liingo>
  → transcribed **verbatim** into
  [`_CLEK_LIST.md`](research/clek-strollers/_CLEK_LIST.md) (24 brands, 80 rows,
  exact adapter names + part numbers + Clek's discontinued/handle-position
  caveats).
- **Mechanism:** the Liing uses the **Maxi-Cosi-style universal footprint**; the
  adapter is made by the **stroller brand** in every case **except UPPAbaby
  CRUZ/Vista**, which use **Clek's own** adapter.
- **🚩 Correction the list forces:** Clek lists **B.O.B. Alterrain/Alterrain Pro
  (owned) as Liing-compatible** via BOB adapter **S12046000** — the existing
  car-seat study's `clek-liing.fitsAlterrain: false` is wrong and should be
  flipped in integration.

---

## 2. Two modules & the roster

| Module (seed.json id) | Label | Items | Roster |
|-----------------------|-------|:-----:|--------|
| `clek-stroller` | Clek-Compatible Strollers | **80** | [`clek-strollers/_ROSTER.md`](research/clek-strollers/_ROSTER.md) |
| `adapter` | Car-Seat Stroller Adapters | **58** | [`adapters/_ROSTER.md`](research/adapters/_ROSTER.md) |

The two modules relate: every stroller carries `adapterIds[]` and every adapter
carries `forStrollerIds[]`, so the app can show "this stroller needs adapter X
($Y, in stock)" and "this adapter fits N strollers." This is the same
data-driven cross-module pattern already in
[`compatibility.ts`](../src/lib/compatibility.ts).

> These are **new** modules — they do not disturb the existing `stroller` module
> (the 3 BOB joggers) or the 15 car seats. The integration pass decides whether
> to cross-link the owned BOB Alterrain into the new stroller module.

---

## 3. What to source per item (all values must be citable)

### 3a. Stroller fields — schema: [`clek-strollers/_TEMPLATE.json`](research/clek-strollers/_TEMPLATE.json)

Every number ties to a manufacturer/retailer spec page in `sources[]`. Required:

- **Weight** — stroller weight (lb).
- **Dimensions — BOTH states** (length × width × height, inches):
  - **Unfolded** (in-use footprint): `unfoldedIn.lengthIn / widthIn / heightIn`
  - **Folded**: `foldedIn.lengthIn / widthIn / heightIn`
- **Brake** — `brake.hasBrake` + `brake.type` (foot parking / hand / auto-lock /
  one-step linked).
- **Capacity** — `capacity.maxChildWeightLb`, `capacity.maxChildHeightIn`,
  newborn/min-age, `seatCount`, basket capacity.
- **Safety tests / standards** — `safety.standards` (e.g. **ASTM F833**, EN 1888),
  `safety.certifications` (e.g. **JPMA Certified**, Greenguard Gold fabric),
  harness/latch notes — cite the page that states them.
- **Fold type / stroller type / recline / reversible seat / tires** — context.
- **Price** — 2–4 US retailers → `priceSources` (retailer, price, deep link,
  `inStock`, `checkedAt`).
- **Adapter link** — `adapterIds[]` from the adapter roster.
- **Image** — clean product shot → `public/images/<stroller-id>.jpg`, ~400–800px.

### 3b. Adapter fields — schema: [`adapters/_TEMPLATE.json`](research/adapters/_TEMPLATE.json)

- **Part number** + **who makes it** (stroller brand vs Clek).
- **Seat-brand support** (Maxi-Cosi/Cybex/Nuna/Clek) — confirm the **Clek Liing**
  is explicitly supported.
- **Status** — discontinued? in stock? (Clek flags several discontinued.)
- **Price** — `priceSources` (deep-linked, dated) + which strollers it serves
  (`forStrollerIds[]`).
- **Image** → `public/images/<adapter-id>.jpg`.

---

## 4. Parallel execution model (conflict-free — mirrors the car-seat effort)

Same rule as [`RESEARCH_PLAN.md`](RESEARCH_PLAN.md): **sourcing sessions never
edit `seed.json` or `dataVersion`.** Each session only *creates* new files whose
names contain its own ids — so two sessions can never write the same path:

```
  10 parallel brand sessions (S1–S10)                one serial integration pass
  ───────────────────────────────────                ───────────────────────────
  each session, for its brand:                        reads ALL fragments
   • docs/research/clek-strollers/<stroller-id>.json  folds strollers → clek-stroller module
   • docs/research/adapters/<adapter-id>.json         folds adapters → adapter module
   • public/images/<stroller-id>.jpg                  links stroller↔adapter ids
   • public/images/<adapter-id>.jpg                   scores both modules
   • commits its own new files to its branch          bumps dataVersion ×1, build+test, push
```

**Each brand session sources its strollers AND those strollers' adapters** (same
DTC pages → efficient, and adapters are brand-specific so no cross-session
collisions). Batches and exact id lists are in the two `_ROSTER.md` files.

| Batch | Branch | Strollers | Adapters |
|-------|--------|:---------:|:--------:|
| **S1 Baby Jogger** | `claude/source-clek-s1-babyjogger` | 6 | 4 |
| **S2 Bugaboo** | `claude/source-clek-s2-bugaboo` | 13 | 9 |
| **S3 BOB/Britax/Bumbleride** | `claude/source-clek-s3-bob-britax-bumbleride` | 8 | 6 |
| **S4 Joolz/M&P/Mima** | `claude/source-clek-s4-joolz-mp-mima` | 8 | 8 |
| **S5 Joovy** | `claude/source-clek-s5-joovy` | 8 | 3 |
| **S6 Silver Cross** | `claude/source-clek-s6-silvercross` | 7 | 5 |
| **S7 Stokke/BabyZen** | `claude/source-clek-s7-stokke-babyzen` | 4 | 2 |
| **S8 Thule** | `claude/source-clek-s8-thule` | 5 | 4 |
| **S9 UPPAbaby** | `claude/source-clek-s9-uppababy` | 8 | 5 |
| **S10 Long-tail** | `claude/source-clek-s10-longtail` | 13 | 12 |

---

## 5. Per-session prompt (copy-paste, set `<Sx>` + brand)

> You are a **Clek-compatibility sourcing session** for the baby-gear app. Read
> `docs/CLEK_COMPAT_RESEARCH_PLAN.md`, `docs/SOURCING.md`,
> `docs/research/clek-strollers/_ROSTER.md`,
> `docs/research/adapters/_ROSTER.md`, and both `_TEMPLATE.json` files. You are
> **Batch `<Sx>` (`<Brand>`)**. Create and check out branch
> `claude/source-clek-<sx>-<brand>` off
> `claude/clek-liing-stroller-research-dtlmrm`.
>
> Handle **only** the stroller ids and adapter ids listed for `<Sx>` in the two
> rosters (and no others). For **each stroller id**:
> 1. Confirm it's on Clek's list (`_CLEK_LIST.md`) — if not, stop and flag.
> 2. From the manufacturer's spec page + 2–4 US retailers, source **every** field
>    in `clek-strollers/_TEMPLATE.json`: weight; **folded AND unfolded L×W×H**;
>    brake (has one? type?); weight & size capacity; **safety tests/standards
>    (ASTM/JPMA/etc.)**; fold type; recline; tires; and `priceSources`
>    (deep-linked, dated, in-stock). Any genuinely unpublished spec → `null` +
>    explain in `notes`; never guess.
> 3. Download a clean product image to `public/images/<stroller-id>.jpg`.
> 4. Write `docs/research/clek-strollers/<stroller-id>.json`, set `adapterIds[]`.
>
> For **each adapter id** in your batch: fill `adapters/_TEMPLATE.json` — part #,
> maker, seat-brand support (confirm **Clek Liing** fits), **discontinued/in-stock
> status**, `priceSources`, `forStrollerIds[]`, and image
> `public/images/<adapter-id>.jpg`.
>
> **Do NOT edit `src/data/seed.json`, `dataVersion`, scores, or any file outside
> your own `<id>` fragments/images.** Commit your new files and
> `git push -u origin claude/source-clek-<sx>-<brand>`. Report a one-line
> weight+fold+price summary per stroller and a price/availability line per
> adapter. Do **not** open a PR.

---

## 6. Integration pass (run last, single session)

> You are the **integration pass** for the Clek-compatibility effort. All S1–S10
> branches have pushed fragments under `docs/research/clek-strollers/` and
> `docs/research/adapters/` + images. On
> `claude/clek-liing-stroller-research-dtlmrm`:
> 1. Gather every stroller + adapter fragment (merge/cherry-pick the batch
>    branches).
> 2. Add two modules to `seed.json`: **`clek-stroller`** (options from the
>    stroller fragments — attributes: weight, folded/unfolded dims, brake,
>    capacity, safety, fold type, `adapterIds`, `fitsLiing: true`) and
>    **`adapter`** (options from the adapter fragments — part #, maker,
>    seat-brand support, status, `forStrollerIds`). Fold in each option's
>    `priceSources` + `image`.
> 3. Extend `OptionAttributes` in [`types.ts`](../src/lib/types.ts) with the new
>    stroller-spec + adapter fields; add a `clek-stroller ↔ Liing` (and
>    `clek-stroller ↔ adapter`) relation to `compatibilityMap` in
>    [`compatibility.ts`](../src/lib/compatibility.ts).
> 4. Score both modules on the rubric below; **flip
>    `clek-liing.fitsAlterrain → true`** (cite adapter S12046000) and mark the
>    owned Clek Liing + BOB Alterrain Pro as `keep` in `inventory`.
> 5. Bump `dataVersion` **once**, run `npm run build` + `npm test` (both pass),
>    commit, push. PR only if asked.

### Scoring rubric (0–5 per criterion)

**`clek-stroller` module** (portability-first, serving the city/shopping goal):

| Criterion (`id`) | Weight | 5 = |
|------------------|:------:|-----|
| `portability` — Weight & folded size | ×5 | ≤14 lb, tiny self-standing fold |
| `everyday` — Everyday usability (recline, basket, brake, maneuver) | ×3 | one-hand fold, near-flat recline, good brake |
| `adapterease` — Clek Liing adapter ease & cost | ×3 | cheap, in-stock, tool-free; **not** discontinued |
| `price` — Price | ×2 | well under module budget |

**`adapter` module** (catalog/reference):

| Criterion (`id`) | Weight | 5 = |
|------------------|:------:|-----|
| `availability` — In-stock vs discontinued | ×4 | currently sold |
| `cost` — Adapter price | ×3 | cheap / included free |
| `versatility` — Seat-brand + stroller reach | ×2 | fits many seats/strollers |

---

## 7. Data-quality rules (from `SOURCING.md`)

- Lowest **in-stock** `priceSources` = "best price"; always deep-link + date it.
- Mark sold-out `inStock: false` (don't delete); keep `price` as MSRP fallback.
- Images: `public/images/<id>.jpg`, ~400–800px, optimized.
- **Definitive-list discipline:** every item traces to a row in `_CLEK_LIST.md`.
- **No guessed specs:** unpublished number → `null` + a note. Literal facts only.

## 8. Status tracker

| Item | Status |
|------|:------:|
| Roster gate locked (`_CLEK_LIST.md`, 80 strollers / 58 adapters) | ✅ |
| Rosters + templates published (`clek-strollers/`, `adapters/`) | ✅ |
| S1 Baby Jogger · S2 Bugaboo · S3 BOB/Britax/Bumbleride | ⬜ ⬜ ⬜ |
| S4 Joolz/M&P/Mima · S5 Joovy · S6 Silver Cross | ⬜ ⬜ ⬜ |
| S7 Stokke/BabyZen · S8 Thule · S9 UPPAbaby · S10 Long-tail | ⬜ ⬜ ⬜ ⬜ |
| Integration — 2 modules + relations + scores, `dataVersion` bumped | ⬜ |
| 🚩 Flip `clek-liing.fitsAlterrain → true` (BOB adapter S12046000) | ⬜ |
