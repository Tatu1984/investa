"use client";
import { inr } from "@/shared/mocks/plainLanguage";

type Part = { key: string; label: string; pct: number; color: string };

export function MoneyBar({
  amount,
  parts,
  perMonth = false,
}: {
  amount: number;
  parts: Part[];
  perMonth?: boolean;
}) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
        {parts.map((p) => (
          <div
            key={p.key}
            style={{
              width: `${p.pct}%`,
              background: `color-mix(in oklab, ${p.color} 78%, var(--foreground))`,
            }}
          />
        ))}
      </div>
      <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {parts.map((p) => (
          <li key={p.key} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted-foreground">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: `color-mix(in oklab, ${p.color} 78%, var(--foreground))` }}
              />
              {p.label}
            </div>
            <div className="mt-1 font-display text-2xl font-semibold tracking-tight">
              {inr(Math.round((p.pct / 100) * amount))}
              {perMonth && <span className="ml-1 text-sm font-normal text-muted-foreground">/mo</span>}
            </div>
            <div className="text-xs text-muted-foreground">{p.pct}% of your money</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
