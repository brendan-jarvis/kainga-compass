# Kāinga Compass

**Build your own map of Aotearoa** — weighted by what matters to you.

Kāinga Compass is a New Zealand place-matching explorer. Set priorities (affordability, housing growth, jobs, population growth, earnings, lifestyle), optionally pick your **age group**, and see a ranked list plus heatmap of places. Different weights produce different maps.

> *Find where in Aotearoa fits the life you're building.*

**Live:** [kainga-compass.vercel.app](https://kainga-compass-brendanjarvis-projects.vercel.app)

Built with [Next.js 15](https://nextjs.org/) (App Router), React 19, Tailwind CSS v4, shadcn/ui, and [Bun](https://bun.sh/). Place data is **static JSON + client-side scoring** — no place metrics in the database yet.

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
| Place detail `/places/[slug]` | Done |
| District → nested cities/towns map + table | Done |
| City → nested **SA3 suburbs** map + table | Done |
| Methodology `/places/methodology` | Done |
| Light/dark theme (default light) | Done |
| Vercel Analytics + Speed Insights | Done |
| Brand favicon + header mark | Done |

### Geography & boundaries (official Stats NZ)

| Level | Classification | Coverage in app |
|-------|----------------|-----------------|
| **Districts** | Territorial Authority 2023 | **All 67** TAs — full map + table |
| **Cities & towns** | Urban Rural 2023 | All Major + Large + Medium urban areas (~43) |
| **Suburbs** | Statistical Area 3 2023 | Under those cities (SA3 ≈ suburbs; not SA2 street-blocks) |

Boundaries are generalised for the web. Ingest scripts pull public FeatureServers and write `src/data/places/`.

### Scoring (client-side)

Dimensions (0–100 percentiles within the active peer set):

- Affordability (rent, price, multiple)
- Housing growth (rent/price YoY)
- Job growth
- Population growth
- Earnings / career (overall or **age-band** median)
- Lifestyle (density proxy)

**Match Score** = weighted sum of dimension scores.

### Data storage today

```
src/data/places/
  places.json       # metrics + hierarchy (fixture / seeded)
  boundaries.json   # GeoJSON outlines
  metadata.json     # sources, counts, notes
```

Scoring and ranking run in the browser. **No place tables in Supabase.** Auth/DB scaffolding from the T3 stack is present but **not used for place data or saved profiles**.

---

## Local development

```bash
bun install
cp .env.example .env   # Optional for place explorer; needed if you touch auth/DB
SKIP_ENV_VALIDATION=1 bun run dev
```

Open [http://localhost:3000](http://localhost:3000) → **Explore** → `/places`.

Place explorer works with `SKIP_ENV_VALIDATION=1` and no database. Auth, tRPC demo posts, and Drizzle need Postgres env vars if you exercise those paths.

### Useful scripts

```bash
bun run dev                 # Dev server (Turbopack)
bun run build               # Production build
bun run lint
bun run typecheck
bun run ingest:places       # TA + Urban Rural boundaries (cached under scripts/cache/)
bun run ingest:districts    # Ensure all 67 TAs in places + boundaries
bun run ingest:suburbs      # SA3 suburbs under each city
```

`db:push` / `db:studio` exist for the Auth.js schema but are **not required** for the place explorer MVP.

---

## Project structure

```
src/
├── app/
│   ├── page.tsx                 # Landing
│   ├── places/                  # Explorer, detail, methodology
│   └── icon.svg                 # App icon
├── components/
│   ├── site-header.tsx
│   └── ui/                      # shadcn
├── data/places/                 # Static place + boundary data
├── lib/places/                  # Types, scoring, presets, age groups, format
└── server/                      # Auth + Drizzle + tRPC (scaffolding; not place store)
scripts/
├── ingest-places.ts
├── expand-districts.ts
├── ingest-suburbs.ts
└── lib/geo.ts
```

---

## Routes

| Route | Purpose |
|-------|---------|
| `/` | Marketing landing |
| `/places` | Explorer (map + table + controls) |
| `/places/[slug]` | Place detail + nested children where available |
| `/places/methodology` | Formula, boundaries, sources, limits |
| `/api/auth/*` | Auth.js (scaffold) |
| `/api/trpc/*` | tRPC (scaffold / demo) |

---

## What’s not done yet (roadmap)

### Data quality

- [ ] Live **MBIE** rental bond / Market Rent API ingest (replace fixtures)
- [ ] Live **HUD** Local Housing Statistics for prices & multiples
- [ ] Live **Stats NZ LEED/BED** earnings & jobs (incl. proper age/TA series)
- [ ] Expand **cities & towns** beyond the curated ~20 settlements
- [ ] Industry-filtered earnings (e.g. health vs tech)
- [ ] Education / wellbeing dimensions (if reliable public TA series exist)

### Product

- [ ] Compare view (`/places/compare`)
- [ ] Affordability calculator (`/places/calculator`)
- [ ] Dynamic OG images per place / preset
- [ ] Saved profiles / shortlists (**needs auth + DB**)
- [ ] Monthly data refresh (cron or CI ingest)

### Database & auth (scaffolded only)

The stack includes **Supabase Postgres**, **Drizzle**, **Auth.js**, and **tRPC**, but the product MVP does **not** yet:

- [ ] Store place metrics or user weights in Postgres
- [ ] Ship consumer OAuth (Apple / Google / Facebook) or a polished sign-in UI
- [ ] RLS policies for any client-exposed tables
- [ ] Wire saved place-matching profiles for signed-in users

Until then, everything place-related is file-based + client scoring.

---

## Deploy

Deployed on [Vercel](https://vercel.com). Place explorer needs no DB env for static pages. If you enable Auth/DB:

1. Link Supabase (or set `POSTGRES_*` / `DATABASE_URL`)
2. Set `AUTH_SECRET` and `AUTH_URL`
3. Run `bun run db:push` against the direct connection when schema is required

---

## License

Private — all rights reserved.
