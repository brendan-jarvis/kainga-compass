# AGENTS.md

Instructions for AI agents working on Kāinga Compass.

## Project Overview

NZ place-matching explorer: users set priorities (affordability, career, growth, education, lifestyle) and see a dynamic map + ranked list of territorial authorities.

## Tech Stack

- **Next.js 15** (App Router, React 19)
- **Bun** (package manager + runtime)
- **T3 Stack**: tRPC, NextAuth.js v5, Drizzle ORM
- **Supabase** Postgres (not Supabase Auth — use NextAuth)
- **Tailwind CSS v4** + **shadcn/ui** (components in `src/components/ui/`)
- **Vercel** hosting

## Commands

```bash
bun install
cp .env.example .env   # Fill Supabase + GitHub OAuth + AUTH_SECRET
bun run db:push        # Uses DIRECT_URL when set
SKIP_ENV_VALIDATION=1 bun run dev
bun run lint
bun run build
```

## Conventions

- Use `~/` import alias for `src/`.
- Prefer server components; client only when needed.
- tRPC: `publicProcedure` for reads, `protectedProcedure` for writes.
- DB: server-only via Drizzle. Use Supabase pooler URL at runtime, direct URL for migrations.
- Env validation in `src/env.js` — use `SKIP_ENV_VALIDATION=1` for builds without secrets.
- Table prefix: `kainga-compass_*` (see `drizzle.config.ts`).

## Data Sources (planned)

- MBIE rental bond data (median rent by TA)
- HUD Local Housing Statistics (prices, median multiple)
- Stats NZ BED/LEED (earnings, jobs by industry + TA)
- Education Counts (school outcomes)
- Stats NZ GeoJSON (TA boundaries)

## Gotchas

- `DIRECT_URL` required for reliable `db:push` against Supabase.
- `AUTH_URL` must match deployment domain in production.
- GitHub OAuth callback: `/api/auth/callback/github`.
