"use client";
import * as React from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Search, TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Input } from "@/frontend/components/ui/Input";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { Table, THead, TBody, TR, TH, TD } from "@/frontend/components/ui/Table";
import { assetsApi } from "@/frontend/api/endpoints/assets.api";
import type { Asset, AssetType, Signal } from "@/shared/types/asset.types";
import { cn } from "@/frontend/utils/cn";

const TYPES: { key: AssetType | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "equity", label: "Equities" },
  { key: "mf", label: "Mutual Funds" },
  { key: "etf", label: "ETFs" },
  { key: "index", label: "Indices" },
  { key: "commodity", label: "Commodities" },
  { key: "currency", label: "Currency" },
];
const SIGNALS: (Signal | "ALL")[] = ["ALL", "BUY", "HOLD", "AVOID"];

export function AssetsTable({ initialQuery = "" }: { initialQuery?: string }) {
  const [q, setQ] = React.useState(initialQuery);
  const [type, setType] = React.useState<AssetType | "all">("all");
  const [signal, setSignal] = React.useState<Signal | "ALL">("ALL");

  // Server-side: fetch by type. Search is client-side over the returned page for now.
  const { data: all = [], isLoading, error } = useQuery<Asset[]>({
    queryKey: ["assets", type, signal],
    queryFn: () => assetsApi.list({
      type: type !== "all" ? [type] : undefined,
      signal: signal !== "ALL" ? [signal] : undefined,
    }),
    staleTime: 30_000,
  });

  const filtered = React.useMemo(() => {
    if (!q) return all;
    const s = q.toLowerCase();
    return all.filter((a) => a.symbol.toLowerCase().includes(s) || a.name.toLowerCase().includes(s));
  }, [q, all]);

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="relative w-full md:max-w-sm">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search by symbol or name…" className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPES.map((t) => (
              <Button
                key={t.key}
                variant={type === t.key ? "secondary" : "ghost"}
                size="sm"
                className={cn(type === t.key && "border-border")}
                onClick={() => setType(t.key)}
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="mt-3 flex items-center gap-1.5">
          <span className="text-[11px] uppercase tracking-wider text-muted-foreground">Signal</span>
          {SIGNALS.map((s) => (
            <Button key={s} size="sm" variant={signal === s ? "secondary" : "ghost"} onClick={() => setSignal(s)} className={cn("h-7 px-2 text-[11px]", signal === s && "border-border")}>
              {s}
            </Button>
          ))}
          <span className="ml-auto text-[11px] text-muted-foreground">{filtered.length.toLocaleString("en-IN")} results</span>
        </div>

        <div className="mt-4">
          {isLoading && (
            <div className="space-y-2 py-10 text-center text-xs text-muted-foreground">Loading live assets from Neon…</div>
          )}
          {error && !isLoading && (
            <div className="flex flex-col items-center gap-2 py-10 text-center text-sm">
              <AlertCircle className="size-5 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" />
              Couldn't load assets.
            </div>
          )}
          {!isLoading && !error && (
            <Table>
              <THead>
                <TR>
                  <TH>Asset</TH>
                  <TH>Type</TH>
                  <TH className="hidden md:table-cell">Sector</TH>
                  <TH className="text-right">Price</TH>
                  <TH className="text-right">1D</TH>
                  <TH className="text-right">AI score</TH>
                  <TH>Signal</TH>
                </TR>
              </THead>
              <TBody>
                {filtered.slice(0, 200).map((a) => {
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
                      <TD className="text-xs uppercase tracking-wider text-muted-foreground">{a.type}</TD>
                      <TD className="hidden md:table-cell text-xs text-muted-foreground">{a.sector ?? "—"}</TD>
                      <TD className="text-right font-mono text-sm">{a.price ? a.price.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}</TD>
                      <TD className={cn("text-right font-mono text-sm", up ? "text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]" : "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]")}>
                        <span className="inline-flex items-center justify-end gap-0.5">
                          {up ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
                          {up ? "+" : ""}{a.change1d.toFixed(2)}%
                        </span>
                      </TD>
                      <TD className="text-right">
                        <div className="ml-auto flex w-24 items-center justify-end gap-2">
                          <div className="h-1.5 w-14 overflow-hidden rounded-full bg-muted">
                            <div className="h-full bg-accent" style={{ width: `${a.aiScore}%` }} />
                          </div>
                          <span className="font-mono text-xs">{a.aiScore}</span>
                        </div>
                      </TD>
                      <TD><Badge variant={a.signal === "BUY" ? "buy" : a.signal === "AVOID" ? "avoid" : "hold"}>{a.signal}</Badge></TD>
                    </TR>
                  );
                })}
                {filtered.length === 0 && (
                  <TR><TD colSpan={7} className="text-center text-sm text-muted-foreground">No assets match your filters.</TD></TR>
                )}
              </TBody>
            </Table>
          )}
          {filtered.length > 200 && (
            <p className="mt-2 text-[11px] text-muted-foreground">Showing top 200 of {filtered.length.toLocaleString("en-IN")} — refine filters to narrow.</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
