"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid, Legend } from "recharts";
import { X, AlertCircle, Layers } from "lucide-react";
import { Button } from "@/frontend/components/ui/Button";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Input } from "@/frontend/components/ui/Input";
import { assetsExtraApi } from "@/frontend/api/endpoints/assets-extra.api";

const PALETTE = [
  "color-mix(in oklab, var(--accent) 80%, var(--foreground))",
  "color-mix(in oklab, var(--info) 70%, var(--foreground))",
  "color-mix(in oklab, var(--success) 70%, var(--foreground))",
  "color-mix(in oklab, var(--destructive) 70%, var(--foreground))",
  "color-mix(in oklab, var(--warning) 70%, var(--foreground))",
];

type Range = "1M" | "3M" | "6M" | "1Y" | "3Y" | "5Y";

// Groww-style category chips. Empty subTypes = "all" (no filter). Multiple
// subTypes are OR-ed, so "Stocks" picks any of largeCap/midCap/smallCap.
type CategoryKey = "all" | "largeCap" | "midCap" | "smallCap" | "stocks" | "mfs" | "gold" | "indexFund" | "debtFund";
const CATEGORIES: { key: CategoryKey; label: string; subType?: string[]; type?: string[] }[] = [
  { key: "all", label: "All" },
  { key: "largeCap", label: "Large-cap stocks", subType: ["largeCap"] },
  { key: "midCap", label: "Mid-cap stocks", subType: ["midCap"] },
  { key: "smallCap", label: "Small-cap stocks", subType: ["smallCap"] },
  { key: "stocks", label: "Stocks (all)", type: ["equity"] },
  { key: "mfs", label: "Mutual funds", type: ["mf"] },
  { key: "gold", label: "Gold / hedge", subType: ["gold"] },
  { key: "indexFund", label: "Index funds", subType: ["indexFund"] },
  { key: "debtFund", label: "Debt", subType: ["debtFund", "liquidFund"] },
];

export function CompareView({ initial = ["RELIANCE", "HDFCBANK"] }: { initial?: string[] }) {
  const [symbols, setSymbols] = React.useState<string[]>(initial);
  const [range, setRange] = React.useState<Range>("3M");
  const [q, setQ] = React.useState("");
  const [category, setCategory] = React.useState<CategoryKey>("all");

  const results = useQuery({
    queryKey: ["compare", symbols, range],
    queryFn: () => assetsExtraApi.compare(symbols, range),
    enabled: symbols.length > 0,
  });

  const activeCat = CATEGORIES.find((c) => c.key === category)!;
  // When a category is active, the search runs even on an empty query so the
  // user can browse. Otherwise we wait for ≥2 chars typed.
  const browseMode = category !== "all";
  const suggestions = useQuery({
    queryKey: ["assets","search", q, category],
    queryFn: () => assetsExtraApi.search(q, {
      subType: activeCat.subType,
      type: activeCat.type,
      limit: 12,
    }),
    enabled: browseMode || q.length >= 2,
  });

  const add = (s: string) => {
    const u = s.toUpperCase().trim();
    if (!u || symbols.includes(u) || symbols.length >= 5) return;
    setSymbols([...symbols, u]);
    setQ("");
  };
  const remove = (s: string) => setSymbols(symbols.filter((x) => x !== s));

  // Build a merged chart dataset keyed by date
  const merged = React.useMemo(() => {
    const map = new Map<string, Record<string, number | string>>();
    for (const ser of results.data ?? []) {
      for (const p of ser.points) {
        const row = map.get(p.date) ?? { date: p.date };
        row[ser.symbol] = p.pct;
        map.set(p.date, row);
      }
    }
    return Array.from(map.values()).sort((a, b) => String(a.date).localeCompare(String(b.date)));
  }, [results.data]);

  const hasAnyPoints = (results.data ?? []).some((s) => s.points.length > 0);

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-5">
          {/* Category chips */}
          <div className="mb-4 flex flex-wrap gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.key}
                onClick={() => setCategory(c.key)}
                className={
                  "rounded-full border px-3 py-1 text-[11px] transition-colors " +
                  (category === c.key
                    ? "border-accent bg-accent/15 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:bg-muted")
                }
              >
                {c.label}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {symbols.map((sym, i) => (
              <span key={sym} className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-sm">
                <span className="size-2 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
                <span className="font-mono text-sm">{sym}</span>
                <button onClick={() => remove(sym)} className="text-muted-foreground hover:text-foreground" aria-label={`Remove ${sym}`}><X className="size-3.5" /></button>
              </span>
            ))}

            {symbols.length < 5 && (
              <div className="relative">
                <Input
                  placeholder={browseMode ? `Browse ${activeCat.label.toLowerCase()}…` : "Add asset…"}
                  className="w-56"
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") { e.preventDefault(); add(q); }
                  }}
                />
                {((browseMode && (suggestions.data ?? []).length > 0) || (q.length >= 2 && (suggestions.data ?? []).length > 0)) && (
                  <div className="absolute left-0 right-0 top-full z-20 mt-1 max-h-72 overflow-auto rounded-md border border-border bg-popover shadow-md">
                    {(suggestions.data ?? []).slice(0, 12).map((s) => (
                      <button key={s.symbol} onClick={() => add(s.symbol)} className="block w-full px-3 py-1.5 text-left text-xs hover:bg-muted">
                        <span className="font-mono font-medium">{s.symbol}</span>
                        <span className="ml-2 text-muted-foreground">{s.name}</span>
                        {s.subType && <span className="ml-2 rounded-full bg-muted px-1.5 py-0.5 text-[9px] uppercase tracking-wider">{s.subType}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="ml-auto flex items-center gap-1">
              {(["1M","3M","6M","1Y","3Y","5Y"] as Range[]).map((r) => (
                <Button key={r} size="sm" variant={range === r ? "secondary" : "ghost"} onClick={() => setRange(r)} className="h-7 px-2 text-[11px]">
                  {r}
                </Button>
              ))}
            </div>
          </div>

          <div className="mt-6 h-80">
            {results.isLoading ? (
              <div className="h-full shimmer rounded-lg" />
            ) : results.error ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-sm">
                <AlertCircle className="size-5 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" />
                Couldn't load comparison.
              </div>
            ) : !hasAnyPoints ? (
              <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-sm text-muted-foreground">
                <Layers className="size-5" />
                <div>No price history yet for these assets.</div>
                <p className="max-w-md text-xs">
                  This usually means the database hasn&apos;t been bootstrapped yet, or the selected window is shorter than the
                  available history. Run the full ingest pipeline once to load 1Y of data.
                </p>
                <a
                  href="/admin/bootstrap"
                  className="mt-1 inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-muted"
                >
                  Run bootstrap
                </a>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={merged}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={30} />
                  <YAxis tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} unit="%" width={45} />
                  <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => `${Number(v).toFixed(2)}%`} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  {symbols.map((sym, i) => (
                    <Line key={sym} type="monotone" dataKey={sym} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2} dot={false} />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
