"use client";
import Link from "next/link";
import { Wand2, ArrowRight } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button";

export function ForYouBanner() {
  return (
    <div className="relative mb-6 overflow-hidden rounded-xl border border-border bg-card p-5 shadow-sm">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-10 -top-10 h-48 w-48 rounded-full blur-3xl"
        style={{ background: "radial-gradient(circle, color-mix(in oklab, var(--accent) 30%, transparent), transparent 70%)" }}
      />
      <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-4">
          <span className="mt-0.5 inline-flex size-10 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
            <Wand2 className="size-5" />
          </span>
          <div>
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">New · plain English</div>
            <h3 className="mt-0.5 font-display text-lg font-semibold tracking-tight">
              Not sure where to invest? Let us just tell you.
            </h3>
            <p className="mt-1 max-w-xl text-sm text-muted-foreground">
              Answer three quick questions — amount, how long, and your comfort with risk — and we'll give you a
              simple plan: what to buy, how much in rupees, and how long to hold it. No charts required.
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Button size="sm" asChild>
            <Link href="/for-you">
              Build my plan <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
