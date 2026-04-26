"use client";
import Link from "next/link";
import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Star, AlertCircle } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { MetricTile } from "@/frontend/components/ui/MetricTile";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/Tabs";
import { Table, THead, TBody, TR, TH, TD } from "@/frontend/components/ui/Table";
import { PriceChart } from "@/frontend/components/features/assets/PriceChart";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { assetsApi } from "@/frontend/api/endpoints/assets.api";
import { assetsExtraApi } from "@/frontend/api/endpoints/assets-extra.api";
import { signalsApi } from "@/frontend/api/endpoints/signals.api";

export default function AssetDetailPage({ params }: { params: Promise<{ symbol: string }> }) {
  const { symbol } = use(params);

  const { data: asset, isLoading, error } = useQuery({ queryKey: ["assets", symbol], queryFn: () => assetsApi.bySymbol(symbol) });
  const metricsQ = useQuery({ queryKey: ["assets", symbol, "metrics"], queryFn: () => assetsExtraApi.metrics(symbol), enabled: !!asset });
  const sigQ     = useQuery({ queryKey: ["assets", symbol, "signal-history"], queryFn: () => signalsApi.history(symbol), enabled: !!asset });
  const caQ      = useQuery({ queryKey: ["assets", symbol, "corp-actions"], queryFn: () => assetsExtraApi.corporateActions(symbol), enabled: !!asset });

  if (isLoading) return <FadeIn><div className="h-80 rounded-xl border border-border bg-card shimmer" /></FadeIn>;
  if (error || !asset) {
    return (
      <FadeIn>
        <Card><CardContent className="flex flex-col items-center gap-3 p-8 text-center">
          <AlertCircle className="size-6 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" />
          <div className="text-sm font-semibold">Asset not found</div>
          <Button asChild variant="outline" size="sm"><Link href="/assets">Back to assets</Link></Button>
        </CardContent></Card>
      </FadeIn>
    );
  }

  const m = metricsQ.data;
  const sigs = sigQ.data ?? [];
  const cas = caQ.data ?? [];

  return (
    <FadeIn>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/assets"><ArrowLeft className="size-4" /> Back to assets</Link>
        </Button>
      </div>

      <PageHeader
        title={<span className="inline-flex items-baseline gap-3"><span className="font-mono text-xl text-muted-foreground">{asset.symbol}</span><span>{asset.name}</span></span>}
        description={
          <span className="inline-flex items-center gap-2 text-sm">
            <Badge variant="outline" className="uppercase">{asset.type}</Badge>
            {asset.sector && <span>· {asset.sector}</span>}
            {asset.exchange && <span>· {asset.exchange}</span>}
            {asset.benchmark && <span>· vs {asset.benchmark}</span>}
          </span>
        }
        actions={
          <>
            <Button variant="outline" size="sm"><Star className="size-4" /> Watchlist</Button>
            <Button size="sm" asChild><Link href={`/compare?a=${asset.symbol}`}>Compare</Link></Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <MetricTile label="AI score" value={asset.aiScore} hint="0–100 composite" />
        <MetricTile
          label="Signal"
          value={<Badge variant={asset.signal === "BUY" ? "buy" : asset.signal === "AVOID" ? "avoid" : "hold"} className="text-sm font-semibold">{asset.signal}</Badge>}
          hint={`${asset.probability}% prob · conf ${asset.confidence.toFixed(2)}`}
        />
        <MetricTile
          label="Price"
          value={asset.price ? asset.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
          delta={{ value: `${asset.change1d >= 0 ? "+" : ""}${asset.change1d.toFixed(2)}% 1D`, positive: asset.change1d >= 0 }}
        />
        <MetricTile label="Volatility 30D" value={m?.volatility30d != null ? `${m.volatility30d.toFixed(1)}%` : "—"} hint={m?.maxDrawdown != null ? `Max DD ${m.maxDrawdown.toFixed(1)}%` : undefined} />
      </div>

      <Tabs defaultValue="overview" className="mt-6">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="price">Price / NAV</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="signals">Signal history</TabsTrigger>
          <TabsTrigger value="actions">Corp. actions</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card><CardContent className="p-5">
            <h3 className="text-sm font-semibold">Rationale</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{asset.rationale}</p>
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <MetricTile label="RSI (14)" value={m?.rsi14 != null ? m.rsi14.toFixed(0) : "—"} />
              <MetricTile label="Volatility 30D" value={m?.volatility30d != null ? `${m.volatility30d.toFixed(1)}%` : "—"} />
              <MetricTile label="1Y return" value={m?.return1y != null ? `${m.return1y.toFixed(1)}%` : "—"} />
              <MetricTile label="Max drawdown" value={m?.maxDrawdown != null ? `${m.maxDrawdown.toFixed(1)}%` : "—"} />
            </div>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="price"><Card><CardContent className="p-5"><PriceChart symbol={asset.symbol} /></CardContent></Card></TabsContent>

        <TabsContent value="metrics">
          <Card><CardContent className="p-5">
            <Table>
              <THead><TR><TH>Metric</TH><TH className="text-right">Value</TH></TR></THead>
              <TBody>
                {[
                  ["1M return",  m?.return1m != null ? `${m.return1m.toFixed(2)}%` : "—"],
                  ["3M return",  m?.return3m != null ? `${m.return3m.toFixed(2)}%` : "—"],
                  ["1Y return",  m?.return1y != null ? `${m.return1y.toFixed(2)}%` : "—"],
                  ["Volatility 30D (ann.)", m?.volatility30d != null ? `${m.volatility30d.toFixed(2)}%` : "—"],
                  ["Max drawdown",          m?.maxDrawdown != null ? `${m.maxDrawdown.toFixed(2)}%` : "—"],
                  ["MA 20",  m?.ma20 != null ? m.ma20.toFixed(2) : "—"],
                  ["MA 50",  m?.ma50 != null ? m.ma50.toFixed(2) : "—"],
                  ["MA 200", m?.ma200 != null ? m.ma200.toFixed(2) : "—"],
                  ["RSI 14", m?.rsi14 != null ? m.rsi14.toFixed(0) : "—"],
                  ["Data points", m?.dataPoints ?? 0],
                ].map(([k, v]) => (
                  <TR key={String(k)}>
                    <TD className="text-sm">{k}</TD>
                    <TD className="text-right font-mono text-sm">{v as React.ReactNode}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
            {m?.note && <p className="mt-3 text-xs text-muted-foreground">{m.note}</p>}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="signals">
          <Card><CardContent className="p-5">
            {sigs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No historical signals recorded for this asset yet.</p>
            ) : (
              <Table>
                <THead><TR><TH>Date</TH><TH>Signal</TH><TH className="text-right">Prob.</TH><TH className="text-right">Conf.</TH><TH className="hidden md:table-cell">Rationale</TH></TR></THead>
                <TBody>
                  {sigs.map((h) => (
                    <TR key={h.date}>
                      <TD className="font-mono text-xs">{h.date}</TD>
                      <TD><Badge variant={h.signal === "BUY" ? "buy" : h.signal === "AVOID" ? "avoid" : "hold"}>{h.signal}</Badge></TD>
                      <TD className="text-right font-mono text-sm">{h.probability}%</TD>
                      <TD className="text-right font-mono text-sm">{h.confidence.toFixed(2)}</TD>
                      <TD className="hidden md:table-cell text-xs text-muted-foreground max-w-[320px] truncate">{h.rationale}</TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="actions">
          <Card><CardContent className="p-5">
            {cas.length === 0 ? (
              <p className="text-sm text-muted-foreground">No corporate actions recorded.</p>
            ) : (
              <Table>
                <THead><TR><TH>Date</TH><TH>Type</TH><TH>Detail</TH></TR></THead>
                <TBody>
                  {cas.map((a, i) => (
                    <TR key={i}>
                      <TD className="font-mono text-xs">{a.date}</TD>
                      <TD className="capitalize text-sm">{a.type}</TD>
                      <TD className="text-sm text-muted-foreground">
                        {a.ratio ?? ""}{a.amount != null ? ` · ₹${a.amount}` : ""}{a.notes ? ` · ${a.notes}` : ""}
                      </TD>
                    </TR>
                  ))}
                </TBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
