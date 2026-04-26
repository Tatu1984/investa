"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, LineChart, GitCompareArrows, Radar, FileText, Bell, Settings, Sparkles, Wand2, ArrowRight } from "lucide-react";
import { cn } from "@/frontend/utils/cn";

const primary = { href: "/for-you", label: "For you", icon: Wand2 };

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/assets", label: "Assets", icon: LineChart },
  { href: "/compare", label: "Compare", icon: GitCompareArrows },
  { href: "/signals", label: "Signals", icon: Radar },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/alerts", label: "Alerts", icon: Bell },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const primaryActive = pathname === primary.href || pathname.startsWith(primary.href + "/");

  return (
    <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-border bg-card/50 backdrop-blur-sm md:flex md:flex-col">
      <Link href="/dashboard" className="flex items-center gap-2 px-5 py-5">
        <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
          <Sparkles className="size-4" />
        </span>
        <span className="font-display text-lg font-semibold tracking-tight">Investa</span>
      </Link>

      {/* Primary CTA — "For you" */}
      <div className="px-3">
        <Link
          href={primary.href}
          className={cn(
            "group relative flex items-center gap-2.5 overflow-hidden rounded-lg border px-3 py-2.5 text-sm transition-all",
            primaryActive
              ? "border-accent bg-accent/15 text-foreground"
              : "border-border bg-card text-foreground hover:border-accent/60 hover:bg-accent/10"
          )}
        >
          <span
            aria-hidden
            className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full blur-2xl transition-opacity group-hover:opacity-100"
            style={{
              background:
                "radial-gradient(circle, color-mix(in oklab, var(--accent) 35%, transparent), transparent 70%)",
              opacity: primaryActive ? 1 : 0.6,
            }}
          />
          <span className="relative flex size-7 shrink-0 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Wand2 className="size-3.5" />
          </span>
          <span className="relative flex flex-col leading-tight">
            <span className="font-medium">{primary.label}</span>
            <span className="text-[10px] text-muted-foreground">Plain-English plan</span>
          </span>
          <ArrowRight className="relative ml-auto size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>

      <div className="mx-3 my-3 h-px bg-border" />

      <nav className="flex flex-1 flex-col gap-0.5 px-3">
        {nav.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-muted text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className={cn("size-4 transition-transform group-hover:scale-[1.04]", active && "text-accent-foreground")} />
              <span>{label}</span>
              {active && <span className="ml-auto size-1.5 rounded-full bg-accent" />}
            </Link>
          );
        })}
      </nav>

      <div className="m-3 rounded-lg border border-border bg-muted/50 p-3 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">Research-only</div>
        <div className="mt-1 leading-relaxed">Not investment advice. Always do your own diligence.</div>
      </div>
    </aside>
  );
}
