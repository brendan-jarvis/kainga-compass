import { type Config } from "drizzle-kit";

import { env } from "~/env";

export default {
  schema: "./src/server/db/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    // Prefer direct connection for migrations (Supabase pooler can break DDL)
    url: env.DIRECT_URL ?? env.DATABASE_URL,
  },
  tablesFilter: ["kainga-compass_*"],
} satisfies Config;
