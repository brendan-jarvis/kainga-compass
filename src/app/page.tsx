import Link from "next/link";

import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-950 to-slate-950 text-white">
      <div className="container flex max-w-3xl flex-col items-center gap-10 px-4 py-16 text-center">
        <div className="space-y-4">
          <p className="text-sm font-medium tracking-widest text-emerald-300 uppercase">
            Aotearoa New Zealand
          </p>
          <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
            Kāinga Compass
          </h1>
          <p className="text-lg text-slate-300 sm:text-xl">
            Build a personalised map of where to live — weighted by affordability,
            career opportunities, housing growth, education, and lifestyle.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4">
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
            Coming soon
          </span>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white px-6 py-2 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
          >
            {session ? `Sign out (${session.user?.name})` : "Sign in with GitHub"}
          </Link>
        </div>

        <p className="max-w-xl text-sm text-slate-400">
          Powered by public NZ data — MBIE rental bonds, HUD housing statistics,
          Stats NZ employment figures, and more. Methodology and sources will be
          published with the explorer.
        </p>
      </div>
    </main>
  );
}
