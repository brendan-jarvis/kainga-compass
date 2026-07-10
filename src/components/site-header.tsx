import Image from "next/image";
import Link from "next/link";

import { buttonVariants } from "~/components/ui/button";
import { ThemeToggle } from "~/components/theme-toggle";
import { cn } from "~/lib/utils";

export function SiteHeader() {
  return (
    <header className="border-border/50 bg-background/85 sticky top-0 z-50 border-b backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center justify-between gap-3 px-4 sm:px-6">
        <Link
          href="/"
          className="group text-foreground flex min-w-0 items-center gap-2.5"
        >
          <Image
            src="/favicon.svg"
            alt=""
            width={32}
            height={32}
            className="size-8 shrink-0 rounded-lg shadow-sm ring-1 ring-black/5 transition-transform group-hover:scale-[1.04] dark:ring-white/10"
            priority
          />
          <span className="flex min-w-0 flex-col leading-none">
            <span className="truncate text-[0.95rem] font-semibold tracking-tight sm:text-base">
              Kāinga Compass
            </span>
            <span className="text-muted-foreground hidden text-[0.7rem] font-normal tracking-wide sm:block">
              Find your place in Aotearoa
            </span>
          </span>
        </Link>

        <nav className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <Link
            href="/places/methodology"
            className={cn(
              buttonVariants({ variant: "ghost", size: "sm" }),
              "text-muted-foreground hover:text-foreground hidden text-sm sm:inline-flex",
            )}
          >
            Methodology
          </Link>
          <ThemeToggle />
          <Link
            href="/places"
            className={cn(
              buttonVariants({ size: "sm" }),
              "bg-primary text-primary-foreground hover:bg-primary/90 ml-1 font-medium",
            )}
          >
            Explore
          </Link>
        </nav>
      </div>
    </header>
  );
}
