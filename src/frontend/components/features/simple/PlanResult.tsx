"use client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { Sparkles, Calendar, Wallet, Repeat, Coins, AlertCircle, RefreshCw, TrendingUp, Layers, ShieldAlert, ShieldCheck } from "lucide-react";
import { useUiStore, horizonMonths } from "@/frontend/store/uiStore";
import {
  allocationFor,
  horizonLabel,
  horizonHoldFor,
  riskLabel,
  plainRegime,
  inr,
} from "@/shared/mocks/plainLanguage";
import { MoneyBar } from "./MoneyBar";
import { PickCard } from "./PickCard";
import { Stagger, StaggerItem } from "@/frontend/components/motion/Stagger";
import { assetsApi } from "@/frontend/api/endpoints/assets.api";
import { regimeApi } from "@/frontend/api/endpoints/regime.api";
import type { Asset } from "@/shared/types/asset.types";

function SkeletonCard() {
  return <div className="h-48 rounded-xl border border-border bg-card shimmer" />;
}

/**
 * /for-you — AI personal advisor.
 *
 * Reads top BUYs / AVOIDs segmented by asset type from /api/v1/signals/top
 * (which queries signals_daily produced by the rule engine on real Neon prices).
 * Renders dedicated sections so the user sees:
 *   1) Stocks to BUY
 *   2) Mutual funds to invest in
 *   3) Be careful with these (don't buy / consider selling if held)
 *   4) Safe + hedge bucket
 */
export function PlanResult() {
  const { amount, horizon, risk, frequency } = useUiStore();
  const alloc = allocationFor(risk, horizon);
  const months = horizonMonths(horizon);
  const isSip = frequency === "monthly";

  // Type-segmented signal queries — each runs in parallel.
  const stocksBuyQ = useQuery<Asset[]>({
    queryKey: ["signals", "top", "BUY", "equity"],
    queryFn: () => assetsApi.top({ type: "BUY", n: 5, assetType: ["equity"] }),
  });
  const mfsBuyQ = useQuery<Asset[]>({
    queryKey: ["signals", "top", "BUY", "mf"],
    queryFn: () => assetsApi.top({ type: "BUY", n: 5, assetType: ["mf"] }),
  });
  const avoidsQ = useQuery<Asset[]>({
    queryKey: ["signals", "top", "AVOID", "all"],
    queryFn: () => assetsApi.top({ type: "AVOID", n: 4, assetType: ["equity", "mf"] }),
  });
  // Hedge — try GOLDBEES first; fall back to any commodity if not present.
  const hedgeQ = useQuery<Asset | null>({
    queryKey: ["assets", "GOLDBEES"],
    queryFn: () => assetsApi.bySymbol("GOLDBEES").catch(() => null),
  });
  const regime = useQuery({ queryKey: ["regime", "current"], queryFn: regimeApi.current });

  const loading = stocksBuyQ.isLoading || mfsBuyQ.isLoading || avoidsQ.isLoading || regime.isLoading;
  const error = stocksBuyQ.error || mfsBuyQ.error || avoidsQ.error || regime.error;

  const stocks = stocksBuyQ.data ?? [];
  const mfs = mfsBuyQ.data ?? [];
  const avoids = avoidsQ.data ?? [];
  const goldPick = hedgeQ.data ?? null;

  const regimeText = regime.data
    ? plainRegime(regime.data.regime, regime.data.risk)
    : plainRegime("Sideways", "Risk-On");

  // Money math
  const total = isSip ? amount * months : amount;
  const equityAmt = Math.round((alloc.equity / 100) * amount);
  const goldAmt = Math.round((alloc.gold / 100) * amount);
  const debtAmt = amount - equityAmt - goldAmt;
  // Within the equity bucket, default 50/50 between stocks and mutual funds.
  // If one side has no picks, the other gets 100%.
  const haveStocks = stocks.length > 0;
  const haveMfs = mfs.length > 0;
  const stocksShare = haveStocks && haveMfs ? 0.5 : haveStocks ? 1.0 : 0;
  const mfsShare    = haveStocks && haveMfs ? 0.5 : haveMfs ? 1.0 : 0;
  const stocksBucket = Math.round(equityAmt * stocksShare);
  const mfsBucket = Math.round(equityAmt * mfsShare);
  const perStock = haveStocks ? Math.round(stocksBucket / Math.min(stocks.length, 4)) : 0;
  const perMf    = haveMfs    ? Math.round(mfsBucket    / Math.min(mfs.length, 3)) : 0;

  const holdFor = horizonHoldFor(horizon);

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonCard />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <SkeletonCard /><SkeletonCard /><SkeletonCard />
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
            <div className="text-sm font-semibold">Couldn't load live recommendations</div>
            <div className="mt-1 text-xs text-muted-foreground">
              The model needs price data + a daily analytics run. Trigger one with{" "}
              <code className="rounded bg-muted px-1 text-[10px]">POST /api/v1/admin/analytics/run</code>.
            </div>
          </div>
          <button
            onClick={() => { stocksBuyQ.refetch(); mfsBuyQ.refetch(); avoidsQ.refetch(); regime.refetch(); }}
            className="inline-flex items-center gap-1.5 text-xs text-foreground hover:underline"
          >
            <RefreshCw className="size-3" /> Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const noUniverse = stocks.length === 0 && mfs.length === 0;

  return (
    <div className="space-y-8">
      {/* Plan summary */}
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
            <Sparkles className="size-3.5 text-accent-foreground" /> Your AI advisor — built on today's signals
          </div>
          <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight md:text-3xl">
            {isSip ? (
              <>Invest <span className="text-accent-foreground">{inr(amount)}/month</span> across these picks</>
            ) : (
              <>Invest <span className="text-accent-foreground">{inr(amount)}</span> across these picks</>
            )}
          </h2>
          <div className="mt-3 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Badge variant="accent" className="gap-1">
              {isSip ? <Repeat className="size-3" /> : <Coins className="size-3" />}
              {isSip ? "Monthly SIP" : "One-time"}
            </Badge>
            <Badge variant="info" className="gap-1"><Calendar className="size-3" /> {horizonLabel(horizon)}</Badge>
            <Badge variant="accent" className="gap-1"><Wallet className="size-3" /> {riskLabel(risk)}</Badge>
            <span>· {regimeText.headline}</span>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{regimeText.body}</p>

          {isSip && (
            <p className="mt-3 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
              Over <strong className="text-foreground">{months} months</strong> you'll have committed{" "}
              <strong className="font-mono text-foreground">{inr(total)}</strong> in total.
            </p>
          )}

          <div className="mt-6">
            <MoneyBar
              amount={amount}
              perMonth={isSip}
              parts={[
                { key: "equity", label: "Growth (stocks + funds)", pct: alloc.equity, color: "var(--accent)" },
                { key: "debt", label: "Safe (debt / cash-like)", pct: alloc.debt, color: "var(--info)" },
                { key: "gold", label: "Hedge (gold)", pct: alloc.gold, color: "var(--warning)" },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Empty-universe explanation */}
      {noUniverse && (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
            <Layers className="size-6 text-muted-foreground" />
            <div className="text-sm font-semibold">Universe still ingesting</div>
            <p className="max-w-md text-xs text-muted-foreground">
              The signal engine needs price history. Once today's NSE bhavcopy + AMFI NAVs are ingested
              and analytics has run, this page will show real BUY / AVOID picks across stocks and mutual funds.
              Expected within an hour after the daily 22:30 IST cron.
            </p>
          </CardContent>
        </Card>
      )}

      {/* SECTION 1 — Stocks to BUY */}
      {stocks.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight inline-flex items-center gap-2">
                <TrendingUp className="size-5 text-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]" />
                Stocks to buy
              </h3>
              <p className="text-sm text-muted-foreground">
                {haveStocks && haveMfs ? "Half " : "All "}of your growth bucket — {inr(stocksBucket)}{isSip ? "/mo" : ""} across{" "}
                {Math.min(stocks.length, 4)} picks · {holdFor}
              </p>
            </div>
          </div>
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {stocks.slice(0, 4).map((a) => (
              <StaggerItem key={a.symbol}>
                <PickCard asset={a} amount={perStock} holdFor={holdFor} perMonth={isSip} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* SECTION 2 — Mutual funds to BUY */}
      {mfs.length > 0 && (
        <section>
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h3 className="font-display text-xl font-semibold tracking-tight inline-flex items-center gap-2">
                <Layers className="size-5 text-[color-mix(in_oklab,var(--info)_75%,var(--foreground))]" />
                Mutual funds to invest in
              </h3>
              <p className="text-sm text-muted-foreground">
                {haveStocks && haveMfs ? "Half " : "All "}of your growth bucket — {inr(mfsBucket)}{isSip ? "/mo" : ""} across{" "}
                {Math.min(mfs.length, 3)} picks · {holdFor}
              </p>
            </div>
          </div>
          <Stagger className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mfs.slice(0, 3).map((a) => (
              <StaggerItem key={a.symbol}>
                <PickCard asset={a} amount={perMf} holdFor={holdFor} perMonth={isSip} />
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      )}

      {/* SECTION 3 — AVOIDs (don't buy / consider selling if held) */}
      {avoids.length > 0 && (
        <section>
          <div className="mb-3">
            <h3 className="font-display text-xl font-semibold tracking-tight inline-flex items-center gap-2">
              <ShieldAlert className="size-5 text-[color-mix(in_oklab,var(--destructive)_70%,var(--foreground))]" />
              Be careful with these
            </h3>
            <p className="text-sm text-muted-foreground">
              The model flags these as risky right now. Don't buy them — and if you already hold them, consider taking some money off the table.
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {avoids.map((a) => (
              <PickCard key={a.symbol} asset={a} amount={0} holdFor={holdFor} kind="avoid" />
            ))}
          </div>
        </section>
      )}

      {/* SECTION 4 — Safe + Hedge */}
      <section>
        <div className="mb-3">
          <h3 className="font-display text-xl font-semibold tracking-tight inline-flex items-center gap-2">
            <ShieldCheck className="size-5 text-[color-mix(in_oklab,var(--info)_75%,var(--foreground))]" />
            Safe + hedge money
          </h3>
          <p className="text-sm text-muted-foreground">The cushion that keeps your plan steady.</p>
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Card>
            <CardContent className="p-5">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Safe bucket</div>
              <div className="mt-1 font-display text-xl font-semibold tracking-tight">
                {inr(debtAmt)}{isSip && <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>}{" "}
                in a liquid / short-duration debt fund
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                Park this in a short-duration or liquid debt fund at your bank or broker. It earns better than
                a savings account with very little risk and is easy to withdraw.
              </p>
              <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
                Typical choices: HDFC Liquid Fund, ICICI Prudential Short Term Fund, SBI Magnum Low Duration.
                Pick the one that fits your tax bracket — ask your bank or RIA.
              </div>
            </CardContent>
          </Card>

          {goldPick ? (
            <PickCard asset={goldPick} amount={goldAmt} holdFor={holdFor} perMonth={isSip} />
          ) : (
            <Card>
              <CardContent className="p-5">
                <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Hedge bucket</div>
                <div className="mt-1 font-display text-xl font-semibold tracking-tight">
                  {inr(goldAmt)}{isSip && <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>}{" "}
                  in a gold ETF
                </div>
                <p className="mt-3 text-sm leading-relaxed text-foreground/90">
                  Try GOLDBEES or NIPGOLD on your broker. These track the gold price within 0.5% over a year.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </section>

      {/* Source line */}
      <p className="text-center text-xs text-muted-foreground">
        Live model: rule engine `rules-v0.1` running daily on the full NSE + AMFI universe.
        {regime.data && <> Regime as of {new Date(regime.data.date).toLocaleDateString("en-IN")}.</>}
        <br />
        Research-only. This is a guide, not investment advice. Consult a SEBI-registered advisor before acting.
      </p>
    </div>
  );
}
