"use client";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { AlertCircle } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { MetricTile } from "@/frontend/components/ui/MetricTile";
import { Table, THead, TBody, TR, TH, TD } from "@/frontend/components/ui/Table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/frontend/components/ui/Tabs";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { signalsApi } from "@/frontend/api/endpoints/signals.api";
import type { Asset } from "@/shared/types/asset.types";

function SignalTable({ rows }: { rows: Asset[] }) {
  return (
    <Card><CardContent className="p-5">
      <Table>
        <THead><TR><TH>Symbol</TH><TH>Signal</TH><TH className="text-right">Prob.</TH><TH className="text-right">Conf.</TH><TH className="hidden md:table-cell">Rationale</TH><TH className="text-right">AI score</TH></TR></THead>
        <TBody>
          {rows.map((a) => (
            <TR key={a.symbol}>
              <TD className="font-mono text-sm">
                <Link href={`/assets/${a.symbol}`} className="hover:underline">
                  <div className="flex flex-col">
                    <span className="font-medium">{a.symbol}</span>
                    <span className="text-[11px] text-muted-foreground font-sans">{a.name}</span>
                  </div>
                </Link>
              </TD>
              <TD><Badge variant={a.signal === "BUY" ? "buy" : a.signal === "AVOID" ? "avoid" : "hold"}>{a.signal}</Badge></TD>
              <TD className="text-right font-mono text-sm">{a.probability}%</TD>
              <TD className="text-right font-mono text-sm">{a.confidence.toFixed(2)}</TD>
              <TD className="hidden md:table-cell text-xs text-muted-foreground max-w-[420px] truncate">{a.rationale}</TD>
              <TD className="text-right font-mono text-sm">{a.aiScore}</TD>
            </TR>
          ))}
          {rows.length === 0 && <TR><TD colSpan={6} className="text-center text-sm text-muted-foreground">No rows.</TD></TR>}
        </TBody>
      </Table>
    </CardContent></Card>
  );
}

export default function SignalsPage() {
  const today = useQuery({ queryKey: ["signals","today"], queryFn: () => signalsApi.today() });
  const perf  = useQuery({ queryKey: ["signals","performance"], queryFn: signalsApi.performance });

  const buckets = !Array.isArray(today.data) ? today.data : { buys: [], holds: [], avoids: [] };
  const buys = buckets?.buys ?? [];
  const holds = buckets?.holds ?? [];
  const avoids = buckets?.avoids ?? [];

  return (
    <FadeIn>
      <PageHeader title="Signals" description="Every BUY, HOLD, AVOID classification with probability, confidence, and rationale. Live from Neon." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <MetricTile label="BUYs today"  value={buys.length} />
        <MetricTile label="HOLDs today" value={holds.length} />
        <MetricTile label="AVOIDs today" value={avoids.length} />
        <MetricTile label="Window (90D)" value={perf.data?.uniqueDays ?? "—"} hint="signal days recorded" />
      </div>

      {today.error && (
        <div className="mt-4 flex items-start gap-2 rounded-md border border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)] px-3 py-2 text-xs">
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" /> Couldn't load today's signals.
        </div>
      )}

      <Tabs defaultValue="today" className="mt-6">
        <TabsList>
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        <TabsContent value="today" className="space-y-5">
          <section><h3 className="mb-2 text-sm font-semibold tracking-tight">BUYs</h3><SignalTable rows={buys} /></section>
          <section><h3 className="mb-2 text-sm font-semibold tracking-tight">HOLDs</h3><SignalTable rows={holds} /></section>
          <section><h3 className="mb-2 text-sm font-semibold tracking-tight">AVOIDs</h3><SignalTable rows={avoids} /></section>
        </TabsContent>

        <TabsContent value="performance">
          <Card><CardContent className="p-5">
            <h3 className="text-sm font-semibold">Signal activity · last 90 days</h3>
            <p className="mt-1 text-xs text-muted-foreground">{perf.data?.note}</p>
            <div className="mt-4 grid grid-cols-2 gap-4 md:grid-cols-4">
              <MetricTile label="BUY count"   value={perf.data?.totals?.BUY   ?? 0} hint={`avg prob ${perf.data?.avgProbability?.BUY   ?? 0}%`} />
              <MetricTile label="HOLD count"  value={perf.data?.totals?.HOLD  ?? 0} hint={`avg prob ${perf.data?.avgProbability?.HOLD  ?? 0}%`} />
              <MetricTile label="AVOID count" value={perf.data?.totals?.AVOID ?? 0} hint={`avg prob ${perf.data?.avgProbability?.AVOID ?? 0}%`} />
              <MetricTile label="Days with signals" value={perf.data?.uniqueDays ?? 0} />
            </div>
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </FadeIn>
  );
}
