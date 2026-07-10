import Link from "next/link";
import { ArrowRight, MapPin, SlidersHorizontal, Share2 } from "lucide-react";

import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";

const features = [
  {
    icon: SlidersHorizontal,
    title: "Personal weights",
    description:
      "Affordability, growth, career, and lifestyle — slide what matters and rankings update instantly.",
  },
  {
    icon: MapPin,
    title: "Map + ranked list",
    description:
      "Choropleth of territorial authorities with a synced ranked table of match scores.",
  },
  {
    icon: Share2,
    title: "Shareable views",
    description:
      "Copy a URL with your preset and weights — partners see the same NZ.",
  },
] as const;

export default function Home() {
  return (
    <main className="flex flex-col">
      <section className="from-emerald-950 via-background to-background relative overflow-hidden bg-gradient-to-b px-4 py-20 sm:px-6 sm:py-28">
        <div className="mx-auto flex w-full max-w-3xl flex-col items-center gap-8 text-center">
          <Badge
            variant="secondary"
            className="border-emerald-500/20 bg-emerald-500/10 text-emerald-200"
          >
            <MapPin className="size-3" />
            Aotearoa New Zealand
          </Badge>
          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Build your own map of Aotearoa
            </h1>
            <p className="text-muted-foreground mx-auto max-w-2xl text-lg">
              Kāinga Compass ranks cities and districts by what matters to you —
              not a one-size national league table. Three people, three
              different NZs.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              render={<Link href="/places" />}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
              size="lg"
            >
              Explore places
              <ArrowRight data-icon="inline-end" />
            </Button>
            <Button
              render={<Link href="/places/methodology" />}
              variant="outline"
              size="lg"
            >
              How scoring works
            </Button>
          </div>
          <p className="text-muted-foreground max-w-lg text-sm">
            Powered by public NZ housing and census-derived indicators. Always
            transparent — see sources and limitations on the methodology page.
          </p>
        </div>
      </section>

      <section className="mx-auto grid w-full max-w-5xl gap-4 px-4 py-12 sm:grid-cols-3 sm:px-6">
        {features.map((feature) => (
          <Card key={feature.title} className="border-emerald-500/10">
            <CardHeader>
              <div className="bg-emerald-500/10 text-emerald-400 mb-2 flex size-9 items-center justify-center rounded-lg">
                <feature.icon className="size-4" />
              </div>
              <CardTitle className="text-base">{feature.title}</CardTitle>
              <CardDescription>{feature.description}</CardDescription>
            </CardHeader>
          </Card>
        ))}
      </section>

      <section className="border-border/60 border-t px-4 py-12 sm:px-6">
        <Card className="mx-auto max-w-3xl border-emerald-500/15 bg-emerald-950/20">
          <CardHeader>
            <CardTitle>Try a preset in under a minute</CardTitle>
            <CardDescription>
              Laid-back & affordable, Career & social, or Investor — then tweak
              the sliders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              render={<Link href="/places?preset=laid-back" />}
              className="bg-emerald-600 text-white hover:bg-emerald-500"
            >
              Open explorer
              <ArrowRight data-icon="inline-end" />
            </Button>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
