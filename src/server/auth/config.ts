import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { type DefaultSession, type NextAuthConfig } from "next-auth";
import GitHub from "next-auth/providers/github";

import { env } from "~/env";
import { db } from "~/server/db";
import {
  accounts,
  sessions,
  users,
  verificationTokens,
} from "~/server/db/schema";

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

const githubConfigured = Boolean(env.AUTH_GITHUB_ID && env.AUTH_GITHUB_SECRET);

export const authConfig = {
  trustHost: true,
  providers: githubConfigured
    ? [
        GitHub({
          clientId: env.AUTH_GITHUB_ID,
          clientSecret: env.AUTH_GITHUB_SECRET,
        }),
      ]
    : [],
  // enableRLS() returns Omit<table, "enableRLS">; Auth adapter table types still
  // require the enableRLS method on the type, so cast through a common shape.
  adapter: DrizzleAdapter(db, {
    usersTable: users as typeof users & { enableRLS: () => typeof users },
    accountsTable: accounts as typeof accounts & {
      enableRLS: () => typeof accounts;
    },
    sessionsTable: sessions as typeof sessions & {
      enableRLS: () => typeof sessions;
    },
    verificationTokensTable: verificationTokens as typeof verificationTokens & {
      enableRLS: () => typeof verificationTokens;
    },
  }),
  callbacks: {
    session: ({ session, user }) => ({
      ...session,
      user: {
        ...session.user,
        id: user.id,
      },
    }),
  },
} satisfies NextAuthConfig;

export const isAuthEnabled = githubConfigured;
