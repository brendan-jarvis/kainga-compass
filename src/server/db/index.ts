import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "~/env";
import * as schema from "./schema";

/**
 * Cache the database connection in development. This avoids creating a new connection on every HMR
 * update.
 */
const globalForDb = globalThis as unknown as {
  conn: postgres.Sql | undefined;
};

// Placeholder allowed only when env validation is skipped (e.g. CI build without secrets).
const databaseUrl =
  env.DATABASE_URL ?? "postgresql://localhost:5432/kainga_compass_build";

const conn =
  globalForDb.conn ??
  postgres(databaseUrl, {
    // Required for Supabase transaction pooler (PgBouncer) on Vercel/serverless
    prepare: false,
    ssl: databaseUrl.includes("localhost") ? false : "require",
  });

if (env.NODE_ENV !== "production") globalForDb.conn = conn;

export const db = drizzle(conn, { schema });
