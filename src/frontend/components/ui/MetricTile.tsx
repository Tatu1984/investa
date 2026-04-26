import * as React from "react";
import { cn } from "@/frontend/utils/cn";

export function MetricTile({
  label,
  value,
  delta,
  hint,
  className,
}: {
  label: string;
  value: React.ReactNode;
  delta?: { value: string; positive?: boolean };
  hint?: string;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 shadow-sm", className)}>
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-2 flex items-end gap-2">
        <div className="text-2xl font-semibold tracking-tight text-foreground font-display">{value}</div>
        {delta && (
          <span
            className={cn(
              "mb-1 inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              delta.positive
                ? "bg-[color-mix(in_oklab,var(--success)_18%,transparent)] text-[color-mix(in_oklab,var(--success)_80%,var(--foreground))]"
                : "bg-[color-mix(in_oklab,var(--destructive)_15%,transparent)] text-[color-mix(in_oklab,var(--destructive)_80%,var(--foreground))]"
            )}
          >
            {delta.value}
          </span>
        )}
      </div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}
