"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { Sparkles, Calendar, Wallet, Repeat, Coins, AlertCircle, RefreshCw } from "lucide-react";
import { useUiStore, horizonMonths } from "@/frontend/store/uiStore";
import {
  allocationFor,
  horizonLabel,
  horizonHoldFor,
  riskLabel,
  plainRegime,
  pickTop,
  pickAvoids,
  inr,
} from "@/shared/mocks/plainLanguage";
import { MoneyBar } from "./MoneyBar";
import { PickCard } from "./PickCard";
import { Stagger, StaggerItem } from "@/frontend/components/motion/Stagger";
import { assetsApi } from "@/frontend/api/endpoints/assets.api";
import { regimeApi } from "@/frontend/api/endpoints/regime.api";
import type { Asset } from "@/shared/types/asset.types";

function SkeletonCard() {
  return (
    <div className="h-48 rounded-xl border border-border bg-card shimmer" />
  );
}

export function PlanResult() {
  const { amount, horizon, risk, frequency } = useUiStore();
  const alloc = allocationFor(risk, horizon);
  const months = horizonMonths(horizon);
  const isSip = frequency === "monthly";

  // Real data from Neon via the REST API we just built.
  const assets = useQuery<Asset[]>({ queryKey: ["assets", "all"], queryFn: () => assetsApi.list() });
  const regime = useQuery({ queryKey: ["regime", "current"], queryFn: regimeApi.current });

  const loading = assets.isLoading || regime.isLoading;
  const error = assets.error || regime.error;

  const all: Asset[] = assets.data ?? [];
  const equityPicks = pickTop(all, (a) => a.type === "equity" || a.type === "mf", 3);
  const goldPick = all.find((a) => a.symbol === "GOLDBEES");
  const avoids = pickAvoids(all, 2);
  const regimeText = regime.data
    ? plainRegime(regime.data.regime, regime.data.risk)
    : plainRegime("Sideways", "Risk-On");

  // Money math
  const total = isSip ? amount * months : amount;
  const equityAmt = Math.round((alloc.equity / 100) * amount);
  const goldAmt = Math.round((alloc.gold / 100) * amount);
  const debtAmt = amount - equityAmt - goldAmt;
  const perEquityPick = equityPicks.length > 0 ? Math.round(equityAmt / equityPicks.length) : 0;
  const holdFor = horizonHoldFor(horizon);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="size-6 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" />
          <div>
            <div className="text-sm font-semibold">Couldn't load live data</div>
            <div className="mt-1 text-xs text-muted-foreground">
              The server isn't returning results right now. Check your connection and try again.
            </div>
          </div>
          <button
            onClick={() => {
              assets.refetch();
              regime.refetch();
            }}
            className="inline-flex items-center gap-1.5 text-xs text-foreground hover:underline"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Plan summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-foreground" /> Your plan, in one page
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {isSip ? (
              <>
                Invest <span className="text-accent-foreground">{inr(amount)}/month</span> across three buckets
              </>
            ) : (
              <>
                Invest <span className="text-accent-foreground">{inr(amount)}</span> across three buckets
              </>
            )}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="accent" className="gap-1">
              {isSip ? <Repeat className="size-3" /> : <Coins className="size-3" />}
              {isSip ? "Monthly SIP" : "One-time"}
            </Badge>
            <Badge variant="info" className="gap-1">
              <Calendar className="size-3" /> {horizonLabel(horizon)}
            </Badge>
            <Badge variant="accent" className="gap-1">
              <Wallet className="size-3" /> {riskLabel(risk)}
            </Badge>
            <span>· {regimeText.headline}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{regimeText.body}</p>

          {isSip && (
            <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Over <strong className="text-foreground">{months} months</strong> you'll have committed{" "}
              <strong className="font-mono text-foreground">{inr(total)}</strong> in total. SIPs spread your buying
              across different prices — you automatically buy more when markets are low and less when they're high.
            </p>
          )}

          <div className="mt-6">
            <MoneyBar
              amount={amount}
              perMonth={isSip}
              parts={[
                { key: "equity", label: "Growth (stocks / funds)", pct: alloc.equity, color: "var(--accent)" },
                { key: "debt", label: "Safe (debt / cash-like)", pct: alloc.debt, color: "var(--info)" },
                { key: "gold", label: "Hedge (gold)", pct: alloc.gold, color: "var(--warning)" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Growth picks */}
      <section>
        <div className="mb-3">
          <h3 className="font-display text-xl font-semibold tracking-tight">Where to put your growth money</h3>
          <p className="text-sm text-muted-foreground">
            {isSip
              ? `${inr(equityAmt)}/month split across ${equityPicks.length} picks · ${holdFor}`
              : `${inr(equityAmt)} split across ${equityPicks.length} picks · ${holdFor}`}
          </p>
        </div>
        {equityPicks.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">
              No growth-tagged BUYs in the database yet. Once the signals pipeline runs, this section will
              populate automatically.
            </CardContent>
          </Card>
        ) : (
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {equityPicks.map((a) => (
              <StaggerItem key={a.symbol}>
                <PickCard asset={a} amount={perEquityPick} holdFor={holdFor} perMonth={isSip} />
              </StaggerItem>
            ))}
          </Stagger>
        )}
      </section>

      {/* Safe + hedge */}
      <section>
        <div className="mb-3">
          <h3 className="font-display text-xl font-semibold tracking-tight">Safe + hedge money</h3>
          <p className="text-sm text-muted-foreground">The cushion that keeps your plan steady.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Safe bucket</div>
              <div className="mt-1 font-display text-xl font-semibold tracking-tight">
                {inr(debtAmt)}
                {isSip && <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>} in a liquid /
                short-duration debt fund
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                Park this portion in a short-duration or liquid debt fund at your bank or broker. It earns better than
                a savings account with very little risk and is easy to withdraw.
              </p>
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Typical choices: HDFC Liquid Fund, ICICI Prudential Short Term Fund, or SBI Magnum Low Duration.
                Ask your bank or RIA for the one that fits your tax bracket.
              </div>
            </CardContent>
          </Card>

          {goldPick && (
            <PickCard asset={goldPick} amount={goldAmt} holdFor={holdFor} perMonth={isSip} />
          )}
        </div>
      </section>

      {/* Avoid list */}
      <section>
        <div className="mb-3">
          <h3 className="font-display text-xl font-semibold tracking-tight">Be careful with these</h3>
          <p className="text-sm text-muted-foreground">The model flags them as risky right now.</p>
        </div>
        {avoids.length === 0 ? (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Nothing flagged as avoid today.</CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {avoids.map((a) => (
              <PickCard key={a.symbol} asset={a} amount={0} holdFor={holdFor} kind="avoid" />
            ))}
          </div>
        )}
      </section>

      {/* Source */}
      <p className="text-center text-xs text-muted-foreground">
        Live data from your Neon database · {all.length} assets · regime updated{" "}
        {regime.data ? new Date(regime.data.date).toLocaleDateString("en-IN") : "—"}.
        <br />
        Research-only. This is a guide, not investment advice. Consult a SEBI-registered advisor before acting.
      </p>
    </div>
  );
}
