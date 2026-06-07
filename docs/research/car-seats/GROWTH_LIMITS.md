# Growth / longevity sourcing pass

Sourced **2026-06-07**. Backs the three "will it keep fitting the baby as he
grows?" criteria added to the `car-seat` module:

- **Outgrow-by-height (headroom)** (`growthheight`, weight 4) ← `attributes.maxHeightIn`
- **Weight capacity** (`growthweight`, weight 2) ← `attributes.maxWeightLb`
- **Infant→toddler longevity** (`growthlongevity`, weight 3) ← `attributes.convertsToToddler` (+ `maxAgeMonths`)

For infant seats the **height** limit is almost always reached before the weight
limit (the child is outgrown when the head is within ~1″ of the shell top, or
shoulders pass the top harness slot), so height carries the heaviest weight of
the three. Weight capacity (30 vs 35 lb) is a clean secondary differentiator.
Convertibility is the categorical leap: only one seat here rear-faces into
toddlerhood as a single seat rather than being a pure infant "bucket."

Every value was read off a fetched manufacturer / retailer / Consumer Reports
spec page (no figures from memory).

| Option | Max height (in) | Max weight (lb) | Converts to toddler | Mfr max age | Confidence | Source |
|---|---|---|---|---|---|---|
| Nuna Pipa Aire RX | 30 | 30 | no | — | high | https://nunababy.com/usa/pipa-aire-rx |
| Cybex Aton G Swivel | 32 | 35 | no | ~18 mo | high | https://www.cybex-online.com/en/us/p/cs-go-aton-g-swivel.html |
| Graco SnugRide 35 Lite LX | 32 | 35 | no | — | high | https://www.consumerreports.org/babies-kids/car-seats/graco-snugride-35-lite-lx/m403647/ |
| Chicco KeyFit 35 | 32 | 35 | no | — | high | https://www.chiccousa.com/shop-our-products/car-seats/infant/keyfit-35-infant-car-seat/79625.html |
| Britax B-Safe Gen2 | 32 | 35 | no | — | high | https://us.britax.com/shop/retired/britax-b-safe-gen2-infant-car-seat |
| Diono LiteClik 30 SafePlus | 30 | 30 | no | — | high | https://store.diono.com/liteclik-30-r-safeplus-infant-car-seat-and-base/ |
| Maxi-Cosi Mico Luxe | 32 | 30 | no | — | high | https://maxicosi.com/products/mico-luxe-infant-car-seat-ic365 |
| Britax Willow Brook S+ (Willow S) | 32 | 30 | no | — | high | https://us.britax.com/shop/car-seats/willow-s-clicktight-infant-car-seat |
| Graco SnugRide SnugFit 35 DLX | 32 | 35 | no | — | high | https://www.consumerreports.org/babies-kids/car-seats/graco-snugride-snugfit-35-dlx/m403646/ |
| Chicco Fit2 (Adapt) | 35 | 35 | **yes** | ~24 mo | high | https://www.chiccousa.com/shop-our-products/car-seats/infant/fit2-adapt-infant-and-toddler-car-seat/79736.html |
| UPPAbaby Mesa V3 | 32 | 30 | no | — | high | https://uppababy.com/car-seats/infant/mesa-v3/ |
| Peg Perego Primo Viaggio 4-35 Nido | 32 | 30 | no | — | high | https://www.pegperego.com/en_us/baby/primo-viaggio-nido-pcode-000000000710.html |
| Clek Liing | 32 | 30 | no | — | high | https://clekinc.com/products/liing |
| Cybex Cloud G Lux | 32 | 35 | no | ~18 mo | high | https://www.cybex-online.com/en/us/p/cs-go-cloud-g-lux-sensorsafe-3.html |
| Doona Car Seat & Stroller | 32 | 30 | no | — | high | https://www.doona.com/en-us/car-seat-stroller/collections/doona-nitro-black |

## Scoring rubric (1–5)

| | Outgrow-by-height | Weight capacity | Infant→toddler longevity |
|---|---|---|---|
| **5** | 35″ shell | 35 lb | converts / rear-faces to ~2 yr |
| **4** | 32″ shell | — | pure bucket, 32″ / 35 lb |
| **3** | — | 30 lb | pure bucket, 32″ / 30 lb |
| **2** | 30″ shell | — | pure bucket, 30″ / 30 lb |

Longevity blends the two capacities for the pure-bucket seats (a 32″/35 lb seat
realistically lasts longer than a 30″/30 lb one) and jumps to 5 only for a seat
that removes the "buy a second seat" step entirely.

## Notes — figures that needed care

- **Naming traps.** Three model names overstate the live spec. The **Peg Perego
  Primo Viaggio _4-35_ Nido**'s current US page lists **4–30 lb**, not 35 — the
  "35" is legacy. The **UPPAbaby Mesa V3** dropped to **30 lb** (the prior
  V2/MESA MAX were 35). The **Diono LiteClik _30_** name encodes both 30 lb and
  30″. Values above are the live spec pages, not the names.
- **Doona** earlier retailer snippets claimed 35 lb; the manufacturer page
  (current US "Doona +") states **4–30 lb / 32″**. Manufacturer value used.
- **Graco** product pages returned HTTP 403 throughout; the SnugRide 35 Lite LX
  and SnugFit 35 DLX limits were read off their dedicated Consumer Reports pages
  (32″ / 35 lb each) and cross-checked against a retailer listing.
- **Max age** is only published by Cybex (~18 mo for the Aton G and Cloud G Lux)
  and Chicco (~24 mo for the Fit2). Where a manufacturer doesn't print an age it
  is left blank rather than guessed; infant buckets are typically outgrown around
  12–18 months in practice, but that is not a printed spec.
- **Convertibility.** Only the **Chicco Fit2** is a two-stage infant *and*
  toddler seat (Stage 1 birth–12 mo, Stage 2 9–24 mo), so it is the lone
  `convertsToToddler: true`. The others are rear-facing-only infant carriers;
  several are marketed as "extended" by capacity (35 lb / 32″) but still must be
  replaced by a convertible seat once outgrown.
</content>
</invoke>
