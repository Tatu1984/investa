"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownRight, Minus, Activity, Clock, TrendingUp, TrendingDown, AlertCircle, RefreshCw } from "lucide-react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { MetricTile } from "@/frontend/components/ui/MetricTile";
import { Table, THead, TBody, TR, TH, TD } from "@/frontend/components/ui/Table";
import { Button } from "@/frontend/components/ui/Button";
import { dashboardApi } from "@/frontend/api/endpoints/dashboard.api";
import { NumberFlow } from "@/frontend/components/motion/NumberFlow";
import { cn } from "@/frontend/utils/cn";

function Shimmer({ className }: { className?: string }) {
  return <div className={cn("rounded-xl border border-border bg-card shimmer", className)} />;
}

export function DashboardLive() {
  const { data, isLoading, error, refetch } = useQuery({ queryKey: ["dashboard","summary"], queryFn: dashboardApi.summary });

  if (isLoading) {
    return (
      <>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Shimmer key={i} className="h-24" />)}
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <Shimmer className="lg:col-span-2 h-80" />
          <Shimmer className="h-80" />
        </div>
      </>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="size-6 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" />
          <div className="text-sm font-semibold">Couldn't load dashboard</div>
          <button onClick={() => refetch()} className="inline-flex items-center gap-1.5 text-xs hover:underline">
            <RefreshCw className="size-3" /> Retry
          </button>
        </CardContent>
      </Card>
    );
  }

  const latest = data.indexSeries[data.indexSeries.length - 1]?.price ?? 0;
  const first = data.indexSeries[0]?.price ?? 0;
  const indexChange = first && latest ? ((latest - first) / first) * 100 : 0;
  const indexUp = indexChange >= 0;

  return (
    <>
      {/* KPI tiles */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {data.kpis.map((k) => (
          <MetricTile key={k.label} label={k.label} value={k.value} delta={k.delta} hint={k.hint} />
        ))}
      </div>

      {/* Headline chart + regime */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-[11px] uppercase tracking-wider text-muted-foreground">NIFTY 50 · recent</div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-2xl font-semibold">
                      {latest.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                    </span>
                    <span className={cn("text-sm font-mono", indexUp ? "text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]" : "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]")}>
                      {indexUp ? "+" : ""}{indexChange.toFixed(2)}%
                    </span>
                  </div>
                </div>
                <div className="text-[11px] text-muted-foreground">{data.indexSeries.length} days · live from Yahoo</div>
              </div>
              <div className="mt-4 h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={data.indexSeries} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="dashHero" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={indexUp ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} stopOpacity={0.35} />
                        <stop offset="100%" stopColor={indexUp ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                    <XAxis dataKey="date" hide />
                    <YAxis domain={["dataMin", "dataMax"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={54} />
                    <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [Number(v).toLocaleString("en-IN"), "Close"] as [string, string]} />
                    <Area type="monotone" dataKey="price" stroke={indexUp ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} strokeWidth={2} fill="url(#dashHero)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between text-[11px] uppercase tracking-wider text-muted-foreground">
              <span className="inline-flex items-center gap-1.5"><Activity className="size-3.5" /> Market regime</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground/80">
                <Clock className="size-3" />
                {new Date(data.asOf).toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata", hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
            <div className="mt-3 flex items-end gap-3">
              <span className="font-display text-4xl font-semibold tracking-tight">{data.regime?.regime ?? "—"}</span>
              {data.regime && <Badge variant={data.regime.risk === "Risk-On" ? "info" : "warning"}>{data.regime.risk}</Badge>}
            </div>
            {data.regime && (
              <>
                <div className="mt-3 flex items-center gap-3 text-xs">
                  <div className="flex-1">
                    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                      <div className="h-full bg-accent" style={{ width: `${data.regime.confidence * 100}%` }} />
                    </div>
                  </div>
                  <span className="font-mono text-muted-foreground">
                    conf <NumberFlow value={data.regime.confidence} format={(v) => v.toFixed(2)} />
                  </span>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">{data.regime.rationale}</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top signals + allocation + sector */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardContent className="p-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">Today's top BUYs</h3>
                <Link href="/signals?filter=BUY" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                  See all <ArrowUpRight className="size-3" />
                </Link>
              </div>
              <Table>
                <THead>
                  <TR>
                    <TH>Symbol</TH>
                    <TH className="text-right">Price</TH>
                    <TH className="text-right">1D</TH>
                    <TH className="text-right">Prob.</TH>
                    <TH className="hidden md:table-cell">Rationale</TH>
                  </TR>
                </THead>
                <TBody>
                  {data.topBuys.slice(0, 6).map((a) => {
                    const up = a.change1d >= 0;
                    return (
                      <TR key={a.symbol}>
                        <TD className="font-mono text-sm">
                          <Link href={`/assets/${a.symbol}`} className="hover:underline">
                            <div className="flex flex-col">
                              <span className="font-medium">{a.symbol}</span>
                              <span className="text-[11px] text-muted-foreground font-sans">{a.name}</span>
                            </div>
                          </Link>
                        </TD>
                        <TD className="text-right font-mono text-sm">{a.price ? a.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</TD>
                        <TD className={cn("text-right font-mono text-sm", up ? "text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]" : "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]")}>
                          <span className="inline-flex items-center justify-end gap-0.5">
                            {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                            {up ? "+" : ""}{a.change1d.toFixed(2)}%
                          </span>
                        </TD>
                        <TD className="text-right font-mono text-sm">{a.probability}%</TD>
                        <TD className="hidden md:table-cell max-w-[320px] truncate text-xs text-muted-foreground">{a.rationale}</TD>
                      </TR>
                    );
                  })}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold tracking-tight">Suggested allocation</h3>
              <p className="mt-1 text-xs text-muted-foreground">Rebalances monthly with regime</p>
              <div className="mt-5 flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
                <div style={{ width: `${data.allocation.equity}%`, background: "color-mix(in oklab, var(--accent) 75%, var(--foreground))" }} />
                <div style={{ width: `${data.allocation.debt}%`,   background: "color-mix(in oklab, var(--info)   75%, var(--foreground))" }} />
                <div style={{ width: `${data.allocation.gold}%`,   background: "color-mix(in oklab, var(--warning) 75%, var(--foreground))" }} />
              </div>
              <ul className="mt-4 space-y-2 text-sm">
                <li className="flex items-center justify-between"><span className="text-muted-foreground">Equity</span><span className="font-mono font-medium">{data.allocation.equity}%</span></li>
                <li className="flex items-center justify-between"><span className="text-muted-foreground">Debt</span><span className="font-mono font-medium">{data.allocation.debt}%</span></li>
                <li className="flex items-center justify-between"><span className="text-muted-foreground">Gold</span><span className="font-mono font-medium">{data.allocation.gold}%</span></li>
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold tracking-tight">Sector strength</h3>
                <span className="text-[11px] text-muted-foreground">1D avg, ≥3 names</span>
              </div>
              <ul className="mt-4 space-y-2.5">
                {data.sectorStrength.length === 0 && (
                  <li className="text-xs text-muted-foreground">Not enough price history yet — run the NSE cron.</li>
                )}
                {data.sectorStrength.map((s) => {
                  const Icon = s.trend === "up" ? ArrowUpRight : s.trend === "down" ? ArrowDownRight : Minus;
                  const color = s.trend === "up" ? "text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]" : s.trend === "down" ? "text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]" : "text-muted-foreground";
                  return (
                    <li key={s.sector} className="flex items-center gap-3 text-sm">
                      <div className="w-28 truncate text-muted-foreground">{s.sector}</div>
                      <div className="relative flex-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                          <div
                            className={cn("h-full", s.trend === "up" ? "bg-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]" : s.trend === "down" ? "bg-[color-mix(in_oklab,var(--destructive)_60%,var(--foreground))]" : "bg-muted-foreground")}
                            style={{ width: `${Math.min(100, Math.abs(s.avgReturn) * 20)}%` }}
                          />
                        </div>
                      </div>
                      <div className={cn("inline-flex w-20 items-center justify-end gap-0.5 font-mono text-xs", color)}>
                        <Icon className="size-3.5" />
                        {s.avgReturn >= 0 ? "+" : ""}{s.avgReturn.toFixed(2)}%
                      </div>
                    </li>
                  );
                })}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Avoid list */}
      <div className="mt-6">
        <Card>
          <CardContent className="p-5">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-semibold tracking-tight">Avoid today</h3>
              <Link href="/signals?filter=AVOID" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                See all <ArrowUpRight className="size-3" />
              </Link>
            </div>
            <Table>
              <THead><TR><TH>Symbol</TH><TH>Signal</TH><TH className="text-right">Prob.</TH><TH className="hidden md:table-cell">Rationale</TH></TR></THead>
              <TBody>
                {data.topAvoids.slice(0, 6).map((a) => (
                  <TR key={a.symbol}>
                    <TD className="font-mono text-sm">
                      <Link href={`/assets/${a.symbol}`} className="hover:underline">
                        <div className="flex flex-col">
                          <span className="font-medium">{a.symbol}</span>
                          <span className="text-[11px] text-muted-foreground font-sans">{a.name}</span>
                        </div>
                      </Link>
                    </TD>
                    <TD><Badge variant="avoid">AVOID</Badge></TD>
                    <TD className="text-right font-mono text-sm">{a.probability}%</TD>
                    <TD className="hidden md:table-cell max-w-[320px] truncate text-xs text-muted-foreground">{a.rationale}</TD>
                  </TR>
                ))}
                {data.topAvoids.length === 0 && (
                  <TR><TD colSpan={4} className="text-center text-sm text-muted-foreground">No AVOIDs today.</TD></TR>
                )}
              </TBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
