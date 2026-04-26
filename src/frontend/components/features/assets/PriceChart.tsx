"use client";
import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { Button } from "@/frontend/components/ui/Button";
import { assetsExtraApi } from "@/frontend/api/endpoints/assets-extra.api";
import { cn } from "@/frontend/utils/cn";

const RANGES = ["1M", "3M", "6M", "1Y", "3Y", "5Y"] as const;

export function PriceChart({ symbol }: { symbol: string }) {
  const [range, setRange] = React.useState<(typeof RANGES)[number]>("3M");
  const { data = [], isLoading } = useQuery({
    queryKey: ["assets", symbol, "history", range],
    queryFn: () => assetsExtraApi.history(symbol, range),
    staleTime: 60_000,
  });

  const first = data[0]?.price ?? 0;
  const last = data[data.length - 1]?.price ?? 0;
  const change = first && last ? ((last - first) / first) * 100 : 0;
  const up = change >= 0;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="font-display text-3xl font-semibold tracking-tight">
            {last ? last.toLocaleString("en-IN", { maximumFractionDigits: 2 }) : "—"}
          </div>
          <div className={cn("font-mono text-sm", up ? "text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]" : "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]")}>
            {up ? "+" : ""}{change.toFixed(2)}% over {range}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {data.length} data points · live from Neon
          </div>
        </div>
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <Button key={r} size="sm" variant={range === r ? "secondary" : "ghost"} onClick={() => setRange(r)} className={cn("h-8 px-2 text-xs", range === r && "border-border")}>
              {r}
            </Button>
          ))}
        </div>
      </div>

      <div className="mt-4 h-80">
        {isLoading ? (
          <div className="h-full w-full shimmer rounded-lg" />
        ) : data.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
            No price history yet for this range. Try a shorter window, or run the NSE/AMFI ingestion.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ left: 0, right: 0, top: 10, bottom: 0 }}>
              <defs>
                <linearGradient id="priceArea" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={up ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} stopOpacity={0.35} />
                  <stop offset="100%" stopColor={up ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} minTickGap={30} />
              <YAxis domain={["dataMin", "dataMax"]} tick={{ fontSize: 10, fill: "var(--muted-foreground)" }} axisLine={false} tickLine={false} width={54} />
              <Tooltip contentStyle={{ background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12 }} formatter={(v) => [Number(v).toLocaleString("en-IN"), "Close"] as [string, string]} />
              <Area type="monotone" dataKey="price" stroke={up ? "color-mix(in oklab, var(--success) 70%, var(--foreground))" : "color-mix(in oklab, var(--destructive) 70%, var(--foreground))"} strokeWidth={2} fill="url(#priceArea)" />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
