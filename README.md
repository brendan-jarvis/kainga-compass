# Kāinga Compass

**Build your own map of Aotearoa** — weighted by what matters to you.

Kāinga Compass is a New Zealand place-matching explorer. Set priorities (affordability, housing growth, jobs, population growth, earnings, lifestyle), optionally pick your **age group**, and see a ranked list plus heatmap of places. Different weights produce different maps.

> *Find where in Aotearoa fits the life you're building.*

**Live:** [kainga-compass.vercel.app](https://kainga-compass-brendanjarvis-projects.vercel.app)

---

## What’s working (MVP)

### Product

| Feature | Status |
|---------|--------|
| Explorer at `/places` | Done |
| Life-stage **presets** + priority **sliders** (weights always sum to 100%) | Done |
| **Age group** filter (overall or 15–24 … 55–64) for career/earnings ranking | Done |
| **Cities & towns** vs **Districts** geography toggle | Done |
| Rank heatmap map (orange = weaker, emerald = stronger) | Done |
| Ranked table (match, avg salary, rent, price, multiple) with header tooltips | Done |
| Shareable URL state (`view`, `preset`, `weights`, `age`) | Done |
| Place detail `/places/[slug]` — including editable priorities on the detail page | Done |
| District → nested cities/towns map + table | Done |
| City → nested **SA3 suburbs** map + table | Done |
| Methodology `/places/methodology` | Done |
| Light/dark theme (default light) | Done |
| Brand favicon + header mark | Done |

### Geography & boundaries (official Stats NZ)

| Level | Classification | Coverage in app |
|-------|----------------|-----------------|
| **Districts** | Territorial Authority 2023 | **All 67** TAs — full map + table |
| **Cities & towns** | Urban Rural 2023 | All Major + Large + Medium urban areas (~43) |
| **Suburbs** | Statistical Area 3 2023 | Under those cities (SA3 ≈ suburbs; not SA2 street-blocks) |

Boundaries are generalised for the web.

### Scoring

Dimensions (0–100 percentiles within the active peer set):

- Affordability (rent, price, multiple)
- Housing growth (rent/price YoY)
- Job growth
- Population growth
- Earnings / career (overall or **age-band** median)
- Lifestyle (density proxy)

**Match Score** = weighted sum of dimension scores. Ranking runs in the browser from static place data.

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/places` | Explorer (map + table + controls) |
| `/places/[slug]` | Place detail + nested children where available |
| `/places/methodology` | Formula, boundaries, sources, limits |

---

## What’s not done yet (roadmap)

### Data quality

- [ ] Live **MBIE** rental bond / Market Rent API ingest (replace fixtures)
- [ ] Live **HUD** Local Housing Statistics for prices & multiples
- [ ] Live **Stats NZ LEED/BED** earnings & jobs (incl. proper age/TA series)
- [ ] Industry-filtered earnings (e.g. health vs tech)
- [ ] Education / wellbeing dimensions (if reliable public TA series exist)

### Product

- [ ] Compare view (`/places/compare`)
- [ ] Affordability calculator (`/places/calculator`)
- [ ] Dynamic OG images per place / preset
- [ ] Saved profiles / shortlists (needs sign-in)
- [ ] Monthly data refresh

---

## License

Private — all rights reserved.
