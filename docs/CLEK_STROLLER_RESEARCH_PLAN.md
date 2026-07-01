# Clek Liing → Compatible City Stroller — Research Plan

**Context.** We now **own** two pieces of the travel system: the **Clek Liing**
infant car seat and the **BOB Alterrain Pro** stroller. The BOB is the
*trail / jogging / extended-trip* stroller. This effort sources a **second,
complementary stroller**: a **lighter, smaller, more portable** ride for
**city / shopping** use that the Clek Liing clicks into.

**Goal.** Evaluate strollers that are **compatible with the Clek Liing** — using
**Clek's own published compatibility list as the definitive roster** — and bring
each candidate up to the study's evidentiary bar: current US pricing, a product
image, and verified specs, **every fact sourced to published product data with a
link**.

Read this with [`SOURCING.md`](SOURCING.md) (the data contract),
[`RESEARCH_PLAN.md`](RESEARCH_PLAN.md) (the 15-car-seat effort), and
[`STROLLER_RESEARCH_PLAN.md`](STROLLER_RESEARCH_PLAN.md) (the BOB effort this
mirrors). Same fragment → integration model, same data-quality rules.

---

## 1. The definitive source: Clek's compatibility list

Clek maintains the authoritative list of strollers tested and approved for the
Liing / Liingo. **This list is the gatekeeper — a stroller is only in the roster
if Clek lists it.** Everything else (weight, fold, price) is comparison data
*within* that set.

- **Primary (definitive):** Clek's stroller-compatibility page —
  <https://clekinc.com/compatible-strollers/> (redirect target of
  <https://clekinc.com/pages/stroller-compatibility-for-liing-and-liingo-infant-car-seats>).
- **Primary (definitive):** Clek Support article "What strollers are compatible
  with Liing and Liingo?" —
  <https://support.clekinc.com/hc/en-us/articles/360039384292-What-strollers-are-compatible-with-Liing-and-Liingo>.
- **Adapter FAQ (definitive):**
  <https://support.clekinc.com/hc/en-us/articles/9146003388173-Frequently-Asked-Questions-about-Stroller-Compatibility>
  and the Clek UPPAbaby adapter product page
  <https://clekinc.com/products/car-seat-adapter-for-uppababy-vista-and-cruz>.

### How Liing compatibility actually works (the key mechanism)

> The Liing/Liingo shell uses the **"Maxi-Cosi–style" universal infant-seat
> adapter footprint** (shared with Nuna and Cybex). So it attaches to **any
> stroller that offers a Maxi-Cosi-style adapter** — in most cases an adapter
> **made by the stroller brand itself**. The one exception is **UPPAbaby**, for
> which **Clek makes its own dedicated adapter** (Vista / Cruz, V1–V3).

Clek's stated bar for inclusion: each listed stroller "has been tested with the
Clek Liing/Liingo infant seat (by either a certified independent testing body
and/or the stroller manufacturer) and is compliant with the applicable ASTM
standards for car seats on strollers." Clek also warns to **confirm adapter
availability** with the stroller maker (supply-chain caveat).

### ⚠️ Task 1 — lock the official list verbatim (do this first)

Clek's support pages are bot-blocked (HTTP 403 to automated fetches) and the
public marketing page is JS-rendered (a carousel), so an automated fetch only
surfaced a handful of models. **The first execution task is to capture the
current official list verbatim**, because retailer mirrors show *stale* model
names (e.g. "YoYO+" and "Minu V1" where the current gen is YoYo2 and Minu V2).
Methods, in order:

1. Retrieve `clekinc.com/compatible-strollers/` rendered text (WebSearch snippet
   expansion, or the deep-research skill which can page through it).
2. Cross-check against the Clek Support article and adapter FAQ.
3. Reconcile with retailer "compatible with Clek Liing" collections as
   *secondary confirmation only* (Strolleria, Pish Posh Baby, Baby Cubby,
   Babylist — cited below). **If a model appears on a retailer list but not
   Clek's, it does NOT make the roster** — flag it as "retailer-claimed, not
   Clek-confirmed."

**Deliverable of Task 1:** `docs/research/city-strollers/_CLEK_LIST.md` — the
full official list, verbatim, grouped by brand, each line tagged with its
adapter path (`brand Maxi-Cosi adapter` vs `Clek UPPAbaby adapter`) and the
retrieval URL + date.

### The official list as currently understood (to be confirmed in Task 1)

Brands/models Clek reproduces (subject to verbatim confirmation): **Baby Jogger**
(City Mini, City Mini GT, City Select), **BabyZen** (YoYo), **Bugaboo** (Bee,
Butterfly, Cameleon³, Fox), **Bumbleride** (Indie, Indie Twin, Speed, Era),
**Joolz** (Aer, Day, Geo, Hub), **Mamas & Papas** (Ocarro), **Mima** (Xari),
**Peg Perego / Agio** (z3), **Silver Cross** (Clic, Jet, Wave, Flat), **Stokke**
(Scoot, Trailz, Xplory), **Thule** (Sleek, Urban Glide 2), **UPPAbaby** (Cruz,
Minu, Vista — via Clek's own adapter).

---

## 2. Filtering to the objective: light, compact, portable (city/shopping)

Clek's full list is ~13 brands / 30+ models — most are full-size prams
irrelevant to *portability*. We filter the definitive list down to the
**compact / lightweight / travel** subset that actually serves the city+shopping
goal, and fully source **those**. (Full-size compatible models like UPPAbaby
Vista or Bugaboo Fox are kept as an appendix in `_CLEK_LIST.md`, not sourced,
unless promoted to reference points.)

### The curated compact roster (all drawn from Clek's list)

Each gets a stable `id` = image filename = fragment filename. Weights/folds
below are **hypotheses to verify**, not final data.

| # | Option id | Model | Why it fits the goal | Clek adapter path |
|---|-----------|-------|----------------------|-------------------|
| 1 | `babyzen-yoyo2` | BabyZen YoYo2 (6+) | ~13.6 lb, airline-cabin one-hand fold | Maxi-Cosi–style (BabyZen adapter) |
| 2 | `uppababy-minu-v2` | UPPAbaby Minu V2 | ~16.9 lb, one-hand compact standing fold | **Clek UPPAbaby adapter** |
| 3 | `bugaboo-butterfly` | Bugaboo Butterfly | ~16 lb, cabin-size self-standing fold | Maxi-Cosi–style (Bugaboo adapter) |
| 4 | `silver-cross-jet` | Silver Cross Jet / Clic | ~13 lb, cabin-approved fold | Maxi-Cosi–style (Silver Cross adapter) |
| 5 | `joolz-aer` | Joolz Aer+ / Aer2 | ~13.4 lb, compact fold | Maxi-Cosi–style (Joolz adapter) |
| 6 | `thule-sleek` | Thule Sleek | city/modular, full recline + bassinet option | Maxi-Cosi–style (Thule adapter) |
| 7 | `baby-jogger-city-mini-gt2` | Baby Jogger City Mini GT2 | one-hand fold urban all-rounder | Maxi-Cosi–style (Baby Jogger adapter) |
| 8 | `bugaboo-bee-6` | Bugaboo Bee 6 | compact urban, one-piece fold | Maxi-Cosi–style (Bugaboo adapter) |

**Stretch / verify (promote only if confirmed on Clek's current list):** Nuna
TRVL and Cybex Libelle/Beezy share the Maxi-Cosi footprint but were **not** seen
named on Clek's list in secondary sources — do **not** add unless Task 1
confirms them on the official page.

> Roster is a **default** (curated compact shortlist). If we instead want the
> *full* Clek list sourced, or a few full-size reference strollers added, the
> table above expands — the sourcing pattern is identical either way.

---

## 3. Where this lives in the app

**Default: a new module** so compact strollers aren't scored on jogging terrain
(the existing `stroller` module weights **Ride/terrain ×5**, which would unfairly
sink a 13-lb city stroller).

- **New module** `city-stroller`, label **"City / Compact Stroller"**, budget
  **$600** (typical compact street price; adjust after pricing).
- The existing `stroller` module (3 BOB joggers) stays as the **trail/jogging**
  pick. The two modules are complementary, not competing — matching how the
  BOB and the city stroller serve different trips.

### Scoring rubric (0–5 per criterion, portability-first)

| Criterion (`id`) | Label | Weight | What a 5 looks like |
|------------------|-------|:------:|---------------------|
| `weightfold` | Weight & fold size | **×5** | ≤14 lb, tiny self-standing fold |
| `maneuver` | Maneuverability & everyday use | ×3 | one-hand fold, good recline, usable basket, tight turning |
| `clekfit` | Clek Liing adapter ease & cost | ×3 | cheap/available brand adapter, tool-free click-in |
| `cprice` | Price | ×2 | well under the $600 module budget |

Max weighted = 5×(5+3+3+2) = **65**, same denominator as the other modules.

### Compatibility modeling (data-driven, no engine rewrite)

The compat engine ([`compatibility.ts`](../src/lib/compatibility.ts)) is
extensible via `compatibilityMap`. Add one relation so the app shows a **green
"fits your Clek Liing"** flag on each city-stroller pick:

```ts
{
  id: 'citystroller-liing-fit',
  label: 'City stroller ↔ Clek Liing fit',
  sourceModuleId: 'city-stroller',
  targetModuleId: 'car-seat',
  sourceNoun: 'stroller',
  targetNoun: 'seat',
  targets: [{ label: 'Liing', match: 'Liing', fitAttribute: 'fitsLiing' }],
}
```

Every roster stroller carries `fitsLiing: true` (that's *why* it's on the list),
plus a `clekAdapter` string naming the adapter path and an `adapterCost` number.
The flag stays green; the value is the **auditable adapter fact** it surfaces.

**Also (integration-time):** update `inventory` in `seed.json` to reflect what we
actually own — mark the **Clek Liing** and **BOB Alterrain Pro** as `status:
"keep"` — so the owned-vs-considered compatibility logic is accurate.

### New attributes (add to `OptionAttributes` in `types.ts`)

`fitsLiing?: boolean`, `clekAdapter?: string`, `adapterCost?: number`. Existing
stroller attributes (`weightLb`, `foldedDimsIn`, `tires`, `suspension`,
`maxChildLb`, `adapterSystem`) are reused as-is.

---

## 4. The fields to source per stroller (all must be citable)

Copy [`docs/research/city-strollers/_TEMPLATE.json`](research/city-strollers/_TEMPLATE.json)
to `<id>.json` and fill **every** field. "Literal facts, sourced" means each
number ties to a manufacturer/retailer spec page in `sources[]`.

1. **Price** — 2–4 major US retailers (brand DTC, Amazon, Target, Nordstrom,
   Pottery Barn Kids, Strolleria, Albee Baby, Babylist). Each → `priceSources`
   entry: retailer, price, **deep link**, `inStock`, `checkedAt`. Mark sold-out
   `inStock: false`, don't drop.
2. **Weight** — stroller weight in lb (frame as tested/published; note if it
   excludes canopy/basket).
3. **Folded dimensions** — L × W × H in, self-standing? one-hand? cabin-legal?
4. **Maneuver/use facts** — recline, seat/canopy, basket capacity, wheel type,
   max child lb, front-facing-only vs reversible.
5. **Clek adapter** — exact adapter product name, **who makes it**, its **price**
   and availability, and the deep link (Clek's UPPAbaby adapter page for Minu;
   the stroller brand's Maxi-Cosi-style adapter page for the rest).
6. **Image** — one clean product shot to `public/images/<id>.jpg`, ~400–800px,
   optimized. Set `image: "images/<id>.jpg"`.

---

## 5. Execution model (parallel, conflict-free — mirrors the car-seat effort)

Same rule as [`RESEARCH_PLAN.md`](RESEARCH_PLAN.md): **sourcing sessions never
edit `seed.json` or `dataVersion`** — they only *create* their own
`docs/research/city-strollers/<id>.json` fragments + `public/images/<id>.jpg`
(disjoint filenames → no merge conflicts). One serial **integration pass** folds
everything into `seed.json`, adds the new module + compat relation + attribute
types, re-scores, bumps `dataVersion` once, runs `npm run build` + `npm test`,
and pushes.

Suggested batching (run in parallel, share no files):

| Batch | Strollers |
|-------|-----------|
| **A — ultralight cabin folds** | `babyzen-yoyo2`, `silver-cross-jet`, `joolz-aer` |
| **B — compact one-hand folds** | `uppababy-minu-v2`, `bugaboo-butterfly`, `bugaboo-bee-6` |
| **C — city all-rounders** | `thule-sleek`, `baby-jogger-city-mini-gt2` |

### Per-session prompt (copy-paste)

> You are a **city-stroller sourcing session** for the baby-gear app. Read
> `docs/CLEK_STROLLER_RESEARCH_PLAN.md`, `docs/SOURCING.md`, and
> `docs/research/city-strollers/_TEMPLATE.json`. You are assigned **Batch <X>**:
> ids **`<id1>`, `<id2>`, `<id3>`**. Confirm each is on Clek's official
> compatibility list (`_CLEK_LIST.md`) before sourcing — if it isn't, stop and
> flag it. For each id: source 2–4 US retailer prices (deep-linked, dated,
> in-stock), verify weight / folded dims / recline / basket / max child lb /
> the exact **Clek-compatible adapter (maker + price + link)**, download one
> clean product image to `public/images/<id>.jpg`, and write
> `docs/research/city-strollers/<id>.json` from the template with every fact
> tied to a URL in `sources[]`. Do NOT edit `seed.json`, `dataVersion`, scores,
> or anything outside your own `<id>` files. Commit to this branch and report a
> one-line weight+price summary per stroller. Do not open a PR.

### Integration pass (run last, single session)

> Fold every `docs/research/city-strollers/<id>.json` fragment into `seed.json`:
> add the new **`city-stroller`** module (criteria + budget per the plan), add
> each stroller as an option with verified `attributes` (incl. `fitsLiing`,
> `clekAdapter`, `adapterCost`) + `priceSources` + `image`, score all four
> criteria consistently, add the `citystroller-liing-fit` relation to
> `compatibilityMap`, extend `OptionAttributes` in `types.ts`, mark the Clek
> Liing + BOB Alterrain Pro as owned (`keep`) in `inventory`, bump `dataVersion`
> once, run `npm run build` + `npm test`, commit, push.

---

## 6. Data-quality rules (from `SOURCING.md`)

- Lowest **in-stock** `priceSources` entry = the app's "best price"; always
  include a real **deep link** + `checkedAt` date.
- Mark sold-out listings `inStock: false` instead of deleting them.
- Keep each option's `price` as an MSRP fallback; never remove it.
- Images: `public/images/<id>.jpg`, ~400–800px, optimized; set `image`.
- **Definitive-list discipline:** no stroller enters the roster unless it's on
  Clek's official list. Retailer-only claims are flagged, not sourced.

## 7. Sources consulted while drafting this plan

- Clek official compatibility page — <https://clekinc.com/compatible-strollers/>
- Clek Support, "What strollers are compatible with Liing and Liingo?" —
  <https://support.clekinc.com/hc/en-us/articles/360039384292-What-strollers-are-compatible-with-Liing-and-Liingo>
- Clek UPPAbaby adapter —
  <https://clekinc.com/products/car-seat-adapter-for-uppababy-vista-and-cruz>
- Babylist, strollers compatible with Clek Liing/Liingo —
  <https://www.babylist.com/hello-baby/strollers-compatible-with-clek-liing-and-liingo-car-seats>
- Pish Posh Baby, Clek Liing compatible strollers —
  <https://pishposhbaby.com/blogs/blog/strollers-compatible-clek-liing>
- Strolleria, Clek Liing compatible collection —
  <https://strolleria.com/collections/strollers-compatible-with-clek-liing-infant-car-seat>
- Baby Cubby, Clek Liing compatibility —
  <https://www.babycubby.com/pages/clek-liing-compatibility>

## 8. Status tracker

Update as batches land (✅ done · 🟡 in progress · ⬜ not started).

| Item | Status |
|------|:------:|
| Task 1 — official list captured (`_CLEK_LIST.md`) | ⬜ |
| Batch A sourced (`babyzen-yoyo2`, `silver-cross-jet`, `joolz-aer`) | ⬜ |
| Batch B sourced (`uppababy-minu-v2`, `bugaboo-butterfly`, `bugaboo-bee-6`) | ⬜ |
| Batch C sourced (`thule-sleek`, `baby-jogger-city-mini-gt2`) | ⬜ |
| Integration — module + compat + scores folded, `dataVersion` bumped | ⬜ |
