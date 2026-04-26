import Link from "next/link";
import { ArrowRight, Sparkles, Radar, LineChart, ShieldCheck, Layers } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card, CardContent, CardTitle } from "@/frontend/components/ui/Card";
import { GradientBlob } from "@/frontend/components/motion/GradientBlob";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { Stagger, StaggerItem } from "@/frontend/components/motion/Stagger";
import { ShinyText } from "@/frontend/components/motion/ShinyText";

export default function Home() {
  return (
    <div className="relative min-h-screen bg-background">
      <nav className="relative z-10 mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
        <Link href="/" className="flex items-center gap-2">
          <span className="flex size-7 items-center justify-center rounded-md bg-accent text-accent-foreground">
            <Sparkles className="size-4" />
          </span>
          <span className="font-display text-lg font-semibold tracking-tight">Investa</span>
        </Link>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/login">Log in</Link>
          </Button>
          <Button size="sm" asChild>
            <Link href="/register">
              Get started <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </nav>

      <section className="relative overflow-hidden">
        <GradientBlob />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-6 pb-16 pt-16 text-center md:pt-24">
          <FadeIn>
            <Badge variant="accent" className="mb-6 px-3 py-1 text-xs">
              <Sparkles className="mr-1.5 size-3" />
              Research-only · Indian markets · EOD
            </Badge>
          </FadeIn>

          <FadeIn delay={0.05}>
            <h1 className="font-display text-5xl font-semibold leading-[1.05] tracking-tight text-foreground md:text-7xl">
              A calmer way to <br />
              <ShinyText>understand the market</ShinyText>
            </h1>
          </FadeIn>

          <FadeIn delay={0.15}>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground md:text-lg">
              Investa turns five years of NSE, BSE and AMFI data into a single clear signal per asset — with a
              human-readable rationale you can actually reason about.
            </p>
          </FadeIn>

          <FadeIn delay={0.25}>
            <div className="mt-10 flex flex-col items-center gap-3 sm:flex-row">
              <Button size="lg" asChild>
                <Link href="/register">
                  Start free <ArrowRight className="ml-1.5 size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/dashboard">View demo dashboard</Link>
              </Button>
            </div>
          </FadeIn>
        </div>

        <div className="relative mx-auto max-w-6xl px-6 pb-20">
          <FadeIn delay={0.4} y={20}>
            <div className="overflow-hidden rounded-2xl border border-border bg-card/70 shadow-xl backdrop-blur">
              <div className="flex items-center gap-2 border-b border-border px-4 py-2.5">
                <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--destructive)_70%,var(--foreground))]" />
                <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--warning)_70%,var(--foreground))]" />
                <span className="size-2 rounded-full bg-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]" />
                <span className="ml-3 font-mono text-xs text-muted-foreground">investa.app / dashboard</span>
              </div>
              <div className="grid grid-cols-1 gap-6 p-6 md:grid-cols-3">
                <div className="md:col-span-1 rounded-xl border border-border bg-background p-5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Market regime</div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-semibold">Sideways</span>
                    <Badge variant="info">Risk-On</Badge>
                  </div>
                  <p className="mt-3 text-xs text-muted-foreground">Breadth 1.24 · VIX 14.8 · confidence 0.62</p>
                </div>
                <div className="md:col-span-2 rounded-xl border border-border bg-background p-5">
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Top signals · 22 Apr</div>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {[
                      { s: "RELIANCE", r: "Momentum + RS top decile", b: "BUY" },
                      { s: "PPFCF", r: "Consistency score 9/10", b: "BUY" },
                      { s: "ADANIENT", r: "Volatility > 40%, RS weak", b: "AVOID" },
                      { s: "GOLDBEES", r: "Risk-off tailwind", b: "BUY" },
                    ].map((r) => (
                      <div key={r.s} className="flex items-start justify-between gap-3 rounded-lg border border-border bg-card/70 p-3">
                        <div>
                          <div className="font-mono text-sm">{r.s}</div>
                          <div className="text-xs text-muted-foreground">{r.r}</div>
                        </div>
                        <Badge variant={r.b === "BUY" ? "buy" : "avoid"}>{r.b}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <FadeIn>
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Signal, not noise.</h2>
            <p className="mt-3 text-sm text-muted-foreground md:text-base">
              Everything we build pushes toward one question — should you act on this asset today?
            </p>
          </div>
        </FadeIn>

        <Stagger className="mt-12 grid grid-cols-1 gap-5 md:grid-cols-3">
          {[
            { icon: Layers, title: "Multi-asset coverage", body: "Equities, mutual funds, ETFs, indices, commodities and USD/INR — one explorer, 5+ years of history." },
            { icon: Radar, title: "Explainable signals", body: "BUY / HOLD / AVOID with probability, confidence and plain-English rationale, every day." },
            { icon: LineChart, title: "Risk-aware metrics", body: "Sharpe, Sortino, drawdowns, volatility and relative strength — precomputed and always fresh." },
            { icon: ShieldCheck, title: "Research-only", body: "No brokerage, no orders. Just decisions you can reason about." },
            { icon: Sparkles, title: "Daily Report", body: "A narrative briefing in your inbox by 07:30 IST — web, PDF, or email digest." },
            { icon: Radar, title: "Alerts that matter", body: "Signal-change and risk alerts on the assets you care about." },
          ].map(({ icon: Icon, title, body }) => (
            <StaggerItem key={title}>
              <Card className="h-full">
                <CardContent className="pt-5">
                  <span className="mb-4 inline-flex size-9 items-center justify-center rounded-lg bg-accent/20 text-accent-foreground">
                    <Icon className="size-4" />
                  </span>
                  <CardTitle className="text-base">{title}</CardTitle>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{body}</p>
                </CardContent>
              </Card>
            </StaggerItem>
          ))}
        </Stagger>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-20">
        <div className="overflow-hidden rounded-2xl border border-border bg-card p-10 text-center md:p-14">
          <h3 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Invest with a clearer head.</h3>
          <p className="mx-auto mt-3 max-w-xl text-sm text-muted-foreground md:text-base">
            Free to try. No brokerage integration, no orders, no upsell.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" asChild>
              <Link href="/register">Create account</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/login">I have an account</Link>
            </Button>
          </div>
        </div>
      </section>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-6 text-xs text-muted-foreground md:flex-row">
          <div>© {new Date().getFullYear()} Investa · Research-only platform. Not investment advice.</div>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-foreground">Log in</Link>
            <Link href="/register" className="hover:text-foreground">Register</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
