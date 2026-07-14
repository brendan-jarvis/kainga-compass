# AGENTS.md

Instructions for AI agents working on Kāinga Compass.

## Project Overview

NZ place-matching explorer: users set priorities (affordability, career, growth, education, lifestyle) and see a dynamic map + ranked list of territorial authorities.

## Tech Stack

- **Next.js 15** (App Router, React 19)
- **Bun** (package manager + runtime)
- **T3 Stack**: tRPC, Auth.js (`next-auth` v5), Drizzle ORM
- **Supabase** Postgres (not Supabase Auth — use Auth.js)
- **Tailwind CSS v4** + **shadcn/ui** (components in `src/components/ui/`)
- **Vercel** hosting

## Commands

```bash
bun install
cp .env.example .env   # Fill Supabase + AUTH_SECRET (+ OAuth when configured)
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
- Always call `.enableRLS()` on new tables in `src/server/db/schema.ts`. No policies = default-deny for PostgREST; app access is via the Postgres connection string, not the anon key.
- After `db:push` on Supabase, re-run `supabase/security-rls.sql` if security advisor flags public grants.

## Data Sources (planned)

- MBIE rental bond data (median rent by TA)
- HUD Local Housing Statistics (prices, median multiple)
- Stats NZ BED/LEED (earnings, jobs by industry + TA)
- Education Counts (school outcomes)
- Stats NZ GeoJSON (TA boundaries)

## Auth (planned)

- Migrate/review Auth.js App Router setup (see README roadmap).
- Target providers: Apple, Google, Facebook — not GitHub.
- Callback pattern: `/api/auth/callback/{provider}`

## Gotchas

- `DIRECT_URL` required for reliable `db:push` against Supabase.
- `AUTH_URL` must match deployment domain in production.
- Supabase grants `anon`/`authenticated` full access to new `public` tables by default. Without RLS, anyone with the project URL can read/write Auth.js tables (emails, OAuth tokens, sessions). Keep RLS on; do not expose tables via the Supabase client unless policies are intentional.
