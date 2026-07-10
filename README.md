# Kāinga Compass

**Build your own map of Aotearoa** — weighted by what matters to you.

Kāinga Compass is a New Zealand place-matching tool. Users set priorities (affordability, career, housing growth, education, lifestyle) and see a dynamic map and ranked list of cities and towns. Three people with different goals should see three different NZs light up.

> *Find where in Aotearoa fits the life you're building.*

Built with the [T3 Stack](https://create.t3.gg/): Next.js, Auth.js, tRPC, Drizzle ORM, Tailwind CSS, shadcn/ui, and TypeScript.

**Live:** [kainga-compass.vercel.app](https://kainga-compass-brendanjarvis-projects.vercel.app)

---

## Product vision

This is a **transparent affordability and livability explorer**, not an authoritative "best places to live" ranking. Users build a personal **Match Score** from public data; the methodology and limitations are always visible.

### Core questions

1. *How expensive is it to live here?*
2. *Can I afford it on my income?*
3. *How does this place compare to others for the life I want?*

### What makes it different

- **Personalised weighting** — sliders and presets, not a single national ranking
- **Industry-aware career data** — filter earnings and job growth by sector
- **Honest data** — sources cited, regional proxies flagged, no misleading school "ratings"
- **Shareable views** — URL-encoded priorities (`?preset=investor&industry=health`)

---

## User flows

### 1. Explorer — "Where should I look?"

Land on `/places` → pick a life-stage preset → map colours by Match Score → click top matches → compare radar charts.

### 2. Industry migrant — "I'm a nurse; where pays well without ruinous rent?"

Set industry filter → weight Career + Affordability → ranked list → share URL with a partner.

### 3. Investor — "Where's growing but not peaked?"

Investor preset → sort by housing momentum → cross-check affordability for yield proxy.

### 4. Deep dive

`/places/[slug]` — static SEO page per territorial authority with trends, context, and preset comparisons.

### Life-stage presets (default slider weights)

| Preset | Audience | Emphasis |
|--------|----------|----------|
| **Laid-back & affordable** | Remote workers, lifestyle movers | Affordability, lifestyle, social |
| **Career & social** | Young professionals | Career earnings, job market, social |
| **Investor** | Property investors | Housing momentum, job growth |
| **Family** | Parents with school-age kids | Education outcomes, affordability |
| **Custom** | Power users | All sliders unlocked |

---

## Scoring dimensions (planned)

Each dimension is normalised to a **0–100 percentile** across territorial authorities (TAs). User weights produce a composite **Match Score**.

| Dimension | Metrics (examples) | Primary sources |
|-----------|-------------------|-----------------|
| **Affordability** | Median rent, house price, median multiple | MBIE bond data, HUD Local Housing Statistics |
| **Housing momentum** | YoY / 5yr price & rent change, rent-to-price yield | HUD, MBIE |
| **Career earnings** | Median earnings by industry, growth | Stats NZ BED / LEED |
| **Job market** | Filled jobs growth, unemployment | Stats NZ BED, HLFS |
| **Education** | NCEA attainment, retention (not decile/EQI as "quality") | Education Counts |
| **Social & wellbeing** | Life satisfaction, belonging (regional proxies) | NZ General Social Survey / Treasury LSF |
| **Lifestyle** | Density, age profile, urban/rural | Census summaries |

**Geography:** primary unit is **Territorial Authority** (67 areas). Some metrics are regional-only and will be labelled as proxies in the UI.

---

## Planned routes

```
/                          # Marketing landing (current)
/places                    # Explorer hub: map + sliders + ranked list
/places/calculator         # Full affordability / income tool
/places/compare            # Side-by-side TA comparison
/places/[slug]             # TA detail (e.g. /places/wellington-city)
/places/methodology        # Sources, formulas, limitations
```

---

## Data pipeline (planned)

Public data ingested at build time via `bun run ingest:places`:

| Source | Data |
|--------|------|
| [MBIE rental bond data](https://www.tenancy.govt.nz/about-tenancy-services/data-and-statistics/rental-bond-data/) | Median weekly rent by TA |
| [HUD Local Housing Statistics](https://www.hud.govt.nz/stats-and-insights/local-housing-statistics/) | Median sale price, median multiple, trends |
| [Stats NZ BED / LEED](https://www.stats.govt.nz/) | Earnings and jobs by industry + TA |
| [Education Counts](https://www.educationcounts.govt.nz/) | School outcome aggregates |
| Stats NZ GeoJSON | TA boundaries for choropleth map |

Output: `src/data/places/regions.json` + `boundaries.geojson`, consumed by Server Components; scoring runs client-side for live slider updates.

---

## Tech stack

| Layer | Choice |
|-------|--------|
| Framework | [Next.js 15](https://nextjs.org/) (App Router, React 19) |
| Auth | [Auth.js](https://authjs.dev/) via `next-auth` v5 *(see roadmap — provider migration in progress)* |
| API | [tRPC](https://trpc.io/) |
| Database | [Supabase](https://supabase.com/) Postgres + [Drizzle ORM](https://orm.drizzle.team/) |
| UI | [shadcn/ui](https://ui.shadcn.com/) (Base Nova) + [Tailwind CSS v4](https://tailwindcss.com/) |
| Hosting | [Vercel](https://vercel.com/) |
| Runtime | [Bun](https://bun.sh/) |

Auth uses the Drizzle adapter against Supabase Postgres — **not** Supabase Auth.

---

## Getting started

### 1. Clone and install

```bash
git clone https://github.com/brendan-jarvis/kainga-compass.git
cd kainga-compass
bun install
```

### 2. Supabase

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Link to Vercel via the Supabase integration (auto-injects `POSTGRES_*` vars), or copy connection strings manually.

For **Vercel / serverless**, use the **Transaction pooler** (port `6543`).

For **migrations** (`db:push`), use the **direct** connection (`POSTGRES_URL_NON_POOLING`).

### 3. Environment variables

```bash
cp .env.example .env
```

| Variable | Description |
|----------|-------------|
| `POSTGRES_URL` | Auto-set by Vercel Supabase integration (pooler) |
| `POSTGRES_URL_NON_POOLING` | Auto-set — used for `db:push` via `DIRECT_URL` fallback |
| `DATABASE_URL` | Optional override; otherwise resolved from `POSTGRES_*` |
| `AUTH_SECRET` | `bunx auth secret` — **required on Vercel** |
| `AUTH_URL` | `http://localhost:3000` locally; production Vercel URL |

OAuth provider vars (planned — see roadmap): `AUTH_GOOGLE_*`, `AUTH_APPLE_*`, `AUTH_FACEBOOK_*`.

### 4. Push the database schema

```bash
bun run db:push
```

### 5. Run locally

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

```bash
bun run dev          # Dev server (Turbopack)
bun run build        # Production build
bun run lint         # ESLint
bun run typecheck    # TypeScript
bun run db:push      # Push Drizzle schema to Supabase
bun run db:studio    # Drizzle Studio
```

---

## Deploy to Vercel

1. Import from GitHub at [vercel.com/new](https://vercel.com/new).
2. Link the Supabase integration (provides `POSTGRES_*` automatically).
3. Set `AUTH_SECRET` and `AUTH_URL` in Environment Variables.
4. Deploy — Next.js is auto-detected.

After first deploy, run `bun run db:push` locally once against `POSTGRES_URL_NON_POOLING` if schema isn't applied yet.

---

## Project structure

```
src/
├── app/                    # Next.js App Router
├── components/ui/          # shadcn/ui components
├── lib/                    # Utilities (scoring, formatting — planned)
├── server/
│   ├── api/                # tRPC routers
│   ├── auth/               # Auth.js config
│   └── db/                 # Drizzle schema + client
├── data/places/            # Generated TA data (planned)
└── env.js                  # Validated environment variables
```

---

## Roadmap

### Product

- [ ] NZ territorial authority data ingestion pipeline (`ingest:places`)
- [ ] Interactive choropleth map with priority sliders
- [ ] Industry-filtered career earnings
- [ ] Life-stage presets (laid-back, career, investor, family)
- [ ] Shareable priority URLs and TA comparison view
- [ ] Methodology and data provenance pages
- [ ] Saved place-matching profiles (authenticated users)

### Auth

- [ ] **Review NextAuth → Auth.js (App Router) migration** — confirm we're on current Auth.js patterns for Next.js 15 App Router (`auth.ts`, route handlers, session strategy, edge compatibility)
- [ ] Replace GitHub with consumer providers: **Apple**, **Google**, **Facebook** (Instagram uses Facebook Login)
- [ ] Provider env schema in `src/env.js` + Vercel configuration docs
- [ ] Sign-in UI with shadcn (provider buttons, error states)

### Infrastructure

- [ ] Supabase RLS policies if any tables are exposed via client
- [ ] Monthly data refresh (Vercel cron or manual ingest)
- [ ] Dynamic OG images per TA / preset view

---

## License

Private — all rights reserved.
