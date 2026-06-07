# Rear-facing length sourcing pass

Sourced **2026-06-07**. Records the rear-facing length (front-to-back footprint)
folded into each car-seat option's `attributes.rearFacingLengthIn` in
`src/data/seed.json` (and the audit field `rearFacingShellLengthIn` in each
option's fragment). This is the length that drives tight-vehicle (e.g. Toyota
Tacoma) rear-facing fit, so it also backs the "Tacoma rear-facing fit" criterion
evidence in the app.

Every value was read off a fetched manufacturer / retailer / Consumer Reports
spec page (no figures from memory). "Metric" notes whether the page gave an
explicit rear-facing/shell length or the carrier's overall length/depth (the
front-to-back axis of L×W×H).

| Option | Length (in) | Metric | Confidence | Source |
|---|---|---|---|---|
| Nuna Pipa Aire RX | 27.25 | carrier overall length | high | https://nunababy.com/usa/pipa-aire-rx |
| Cybex Aton G Swivel | 26.1 | carrier length/depth | high | https://www.cybex-online.com/en/us/p/cs-go-aton-g-swivel.html |
| Graco SnugRide 35 Lite LX | 26 | overall length (Consumer Reports) | high | https://www.consumerreports.org/babies-kids/car-seats/graco-snugride-35-lite-lx/m403647/ |
| Chicco KeyFit 35 | 27.5 | rear-facing shell length | medium | https://www.chiccousa.com/shop-our-products/car-seats/infant/keyfit-35-infant-car-seat/79625.html |
| Britax B-Safe Gen2 | 26.6 | carrier depth (front-to-back) | medium | https://us.britax.com/shop/retired/britax-b-safe-gen2-infant-car-seat |
| Diono LiteClik 30 SafePlus | 26.4 | carrier depth (front-to-back) | high | https://store.diono.com/liteclik-30-xt-safeplus-infant-car-seat-and-base/ |
| Maxi-Cosi Mico Luxe | 28.9 | carrier depth (front-to-back) | high | https://kids-n-cribs.com/maxi-cosi-mico-luxe-infant-car-seat/ |
| Britax Willow Brook S+ | 28.1 | carrier overall length | high | https://us.britax.com/shop/car-seats/willow-s-clicktight-infant-car-seat |
| Graco SnugRide SnugFit 35 DLX | 29 | overall length (Consumer Reports) | high | https://www.consumerreports.org/babies-kids/car-seats/graco-snugride-snugfit-35-dlx/m403646/ |
| Chicco Fit2 | 28 | assembled depth / footprint | high | https://www.chiccousa.com/shop-our-products/car-seats/infant/fit2-adapt-infant-and-toddler-car-seat/79736.html |
| UPPAbaby Mesa V3 | 25.8 | carrier overall length | high | https://www.babycubby.com/products/uppababy-mesa-v2-infant-car-seat |
| Peg Perego Primo Viaggio 4-35 Nido | 26 | carrier length dimension | medium | https://strolleria.com/products/peg-perego-primo-viaggio-4-35-nido-infant-car-seat |
| Clek Liing | _no data_ | — | n/a | No explicit front-to-back length confirmed on a fetched spec page |
| Cybex Cloud G Lux | 26.5 | carrier depth (front-to-back) | high | https://strolleria.com/collections/infant-car-seats-compatible-with-cybex-priam/products/cybex-cloud-g-lux-infant-car-seat-and-base |
| Doona Car Seat & Stroller | 26 | car-seat-mode length (not stroller-extended) | high | https://littlefolksnyc.com/products/doona-infant-car-seat |

**Notes**
- **Clek Liing** is intentionally left without a value — no rear-facing length
  could be confirmed on a rendered spec page within the trusted sources, so it
  is omitted rather than guessed. The app simply shows no length chip for it.
- **Medium** confidence rows used the carrier's unlabeled L×W×H string where the
  front-to-back axis was clear from the other two dimensions, or differ slightly
  between sources (e.g. KeyFit 35 measured 27.5"–28").
- `csftl.org` (Car Seats for the Littles) returned HTTP 503 throughout this pass,
  so manufacturer specs and Consumer Reports were used instead.
