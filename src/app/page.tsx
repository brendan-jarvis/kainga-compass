import Link from "next/link";
import { MapPin } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { auth } from "~/server/auth";
import { isAuthEnabled } from "~/server/auth/config";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-emerald-950 via-background to-background px-4 py-16">
      <div className="flex w-full max-w-2xl flex-col items-center gap-8 text-center">
        <div className="space-y-3">
          <Badge variant="secondary" className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200">
            <MapPin className="size-3" />
            Aotearoa New Zealand
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            Kāinga Compass
          </h1>
          <p className="text-muted-foreground text-lg">
            Build a personalised map of where to live — weighted by affordability,
            career opportunities, housing growth, education, and lifestyle.
          </p>
        </div>

        <Card className="w-full border-emerald-500/10 bg-card/80 text-left backdrop-blur">
          <CardHeader>
            <CardTitle>Coming soon</CardTitle>
            <CardDescription>
              The interactive place-matching explorer is in development. Sign in
              to save priority profiles when it launches.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            {isAuthEnabled ? (
              <Button render={<Link href={session ? "/api/auth/signout" : "/api/auth/signin"} />}>
                {session ? `Sign out (${session.user?.name})` : "Sign in with GitHub"}
              </Button>
            ) : (
              <Button disabled variant="secondary">
                GitHub sign-in not configured
              </Button>
            )}
          </CardContent>
        </Card>

        <p className="text-muted-foreground max-w-lg text-sm">
          Powered by public NZ data — MBIE rental bonds, HUD housing statistics,
          Stats NZ employment figures, and more.
        </p>
      </div>
    </main>
  );
}
