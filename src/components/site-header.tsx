import Link from "next/link";
import { Compass } from "lucide-react";

import { buttonVariants } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme-toggle";
import { cn } from "~/lib/utils";

export function SiteHeader() {
  return (
    <header className="border-border/60 bg-background/80 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-foreground flex items-center gap-2 text-base font-medium tracking-normal"
        >
          <span className="bg-primary/15 text-primary flex size-8 items-center justify-center rounded-lg">
            <Compass className="size-4" />
          </span>
          <span className="hidden sm:inline">Kāinga Compass</span>
          <span className="sm:hidden">Kāinga</span>
        </Link>

        <nav className="flex items-center gap-1 sm:gap-2">
          <Link
            href="/places/methodology"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground text-[0.95rem]",
            )}
          >
            Methodology
          </Link>
          <ThemeToggle />
          <Link
            href="/places"
            className={cn(
              buttonVariants({ size: "sm" }),
              "text-[0.95rem]",
            )}
          >
            Explore
          </Link>
        </nav>
      </div>
    </header>
  );
}
