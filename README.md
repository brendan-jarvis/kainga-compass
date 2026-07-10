# Kāinga Compass

A New Zealand place-matching tool — build a personalised map of Aotearoa weighted by what matters to you: affordability, career opportunities, housing growth, education, and lifestyle.

Built with the [T3 Stack](https://create.t3.gg/): Next.js, NextAuth.js, tRPC, Drizzle ORM, Tailwind CSS, and TypeScript.

## Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Auth**: [NextAuth.js v5](https://next-auth.js.org/) (Auth.js)
- **API**: [tRPC](https://trpc.io/)
- **Database**: [Supabase](https://supabase.com/) (Postgres) + [Drizzle ORM](https://orm.drizzle.team/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Hosting**: [Vercel](https://vercel.com/)
- **Runtime**: [Bun](https://bun.sh/)

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/brendan-jarvis/kainga-compass.git
cd kainga-compass
bun install
```

### 2. Create a Supabase project

1. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard).
2. Go to **Project Settings → Database**.
3. Copy the **Connection string** (URI format).

For **Vercel / serverless**, use the **Transaction pooler** connection string (port `6543`, mode `Transaction`).

For **local migrations** (`db:push`, `db:migrate`), use the **Direct connection** string (port `5432`).

### 3. Configure environment variables

```bash
cp .env.example .env
```

Fill in `.env`:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Supabase Postgres URL (pooler for app runtime) |
| `DIRECT_URL` | Supabase direct URL (for Drizzle migrations) |
| `AUTH_SECRET` | Generate with `bunx auth secret` |
| `AUTH_URL` | `http://localhost:3000` locally; your Vercel URL in production |
| `AUTH_GITHUB_ID` / `AUTH_GITHUB_SECRET` | [GitHub OAuth app](https://github.com/settings/developers) |

**GitHub OAuth callback URLs:**

- Local: `http://localhost:3000/api/auth/callback/github`
- Production: `https://your-app.vercel.app/api/auth/callback/github`

### 4. Push the database schema

```bash
# Uses DIRECT_URL when set, otherwise DATABASE_URL
bun run db:push
```

### 5. Run the dev server

```bash
bun run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

```bash
bun run dev          # Start dev server (Turbopack)
bun run build        # Production build
bun run lint         # ESLint
bun run typecheck    # TypeScript check
bun run db:push      # Push Drizzle schema to Supabase
bun run db:studio    # Drizzle Studio
```

## Deploy to Vercel

1. Push this repo to GitHub.
2. Import the project at [vercel.com/new](https://vercel.com/new).
3. Set environment variables in **Project Settings → Environment Variables** (same as `.env.example`).
4. Use the **Transaction pooler** `DATABASE_URL` for production.
5. Set `AUTH_URL` to your production domain (e.g. `https://kainga-compass.vercel.app`).
6. Deploy — Vercel auto-detects Next.js.

After deploying, run `bun run db:push` locally against production `DIRECT_URL` once to apply schema, or add a CI step.

## Project Structure

```
src/
├── app/                 # Next.js App Router pages
├── server/
│   ├── api/             # tRPC routers
│   ├── auth/            # NextAuth.js config
│   └── db/              # Drizzle schema + client
├── trpc/                # tRPC client setup
└── env.js               # Validated environment variables
```

## Roadmap

- [ ] NZ territorial authority data ingestion pipeline
- [ ] Interactive choropleth map with priority sliders
- [ ] Industry-filtered career earnings
- [ ] Saved place-matching profiles (authenticated users)
- [ ] Methodology and data provenance pages

## License

Private — all rights reserved.
