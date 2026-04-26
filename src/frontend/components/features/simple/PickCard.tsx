"use client";
import Link from "next/link";
import { ArrowUpRight, CheckCircle2, Clock, TriangleAlert, Repeat } from "lucide-react";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Badge } from "@/frontend/components/ui/Badge";
import { cn } from "@/frontend/utils/cn";
import type { Asset } from "@/shared/types/asset.types";
import { inr, plainSignalLabel, plainReason, plainReasonAvoid } from "@/shared/mocks/plainLanguage";

export function PickCard({
  asset,
  amount,
  holdFor,
  kind = "buy",
  perMonth = false,
}: {
  asset: Asset;
  amount: number;
  holdFor: string;
  kind?: "buy" | "avoid";
  perMonth?: boolean;
}) {
  const label = plainSignalLabel(asset);
  const reason = kind === "avoid" ? plainReasonAvoid(asset) : plainReason(asset);
  const Icon = kind === "avoid" ? TriangleAlert : CheckCircle2;

  return (
    <Card className={cn("transition-colors", kind === "avoid" ? "bg-[color-mix(in_oklab,var(--destructive)_5%,var(--card))]" : "")}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <Icon className={cn("size-3.5", kind === "avoid" ? "text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" : "text-[color-mix(in_oklab,var(--success)_75%,var(--foreground))]")} />
              {kind === "avoid" ? "Skip for now" : label.label}
            </div>
            <div className="mt-1 truncate font-display text-xl font-semibold tracking-tight">{asset.name}</div>
            <div className="text-[11px] text-muted-foreground">
              <span className="font-mono">{asset.symbol}</span>
              {asset.sector && <> · {asset.sector}</>}
              {asset.type !== "equity" && <> · {String(asset.type).toUpperCase()}</>}
            </div>
          </div>
          <Badge variant={kind === "avoid" ? "avoid" : label.tone}>
            {kind === "avoid" ? "AVOID" : asset.signal}
          </Badge>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-foreground/90">{reason}</p>

        {kind !== "avoid" && (
          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
                {perMonth ? "Per month (SIP)" : "Suggested amount"}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1 font-mono text-base font-semibold">
                {inr(amount)}
                {perMonth && (
                  <span className="inline-flex items-center gap-0.5 text-[10px] font-normal text-muted-foreground">
                    <Repeat className="size-3" /> monthly
                  </span>
                )}
              </div>
            </div>
            <div className="rounded-lg border border-border bg-muted/40 p-3">
              <div className="text-[11px] uppercase tracking-wider text-muted-foreground">How long to hold</div>
              <div className="mt-0.5 inline-flex items-center gap-1 text-sm font-medium">
                <Clock className="size-3.5 text-muted-foreground" /> {holdFor}
              </div>
            </div>
          </div>
        )}

        <div className="mt-4 flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            Confidence: <span className="font-mono text-foreground">{Math.round(asset.confidence * 100)}%</span>
          </span>
          <Link
            href={`/assets/${asset.symbol}`}
            className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground"
          >
            See full details <ArrowUpRight className="size-3" />
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
