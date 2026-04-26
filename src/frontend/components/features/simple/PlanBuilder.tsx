"use client";
import * as React from "react";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Input } from "@/frontend/components/ui/Input";
import { Label } from "@/frontend/components/ui/Label";
import { useUiStore, type Horizon, type Risk, type Frequency } from "@/frontend/store/uiStore";
import { cn } from "@/frontend/utils/cn";
import { Shield, Scale, Rocket, Calendar, Coins, Repeat } from "lucide-react";

const HORIZONS: { key: Horizon; label: string; sub: string }[] = [
  { key: "short", label: "Under 1 year", sub: "I may need the money soon" },
  { key: "medium", label: "1 to 3 years", sub: "A medium-term goal" },
  { key: "long", label: "5 years or more", sub: "Building wealth slowly" },
];

const RISKS: { key: Risk; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "careful", label: "Careful", sub: "I'd rather not lose money", icon: Shield },
  { key: "balanced", label: "Balanced", sub: "Some ups and downs are OK", icon: Scale },
  { key: "growth", label: "Growth-seeking", sub: "I can handle big swings", icon: Rocket },
];

const FREQUENCIES: { key: Frequency; label: string; sub: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { key: "onetime", label: "One-time", sub: "Invest a lump sum today", icon: Coins },
  { key: "monthly", label: "Monthly (SIP)", sub: "Invest the same amount every month", icon: Repeat },
];

const PRESETS_ONETIME = [10000, 50000, 100000, 500000];
const PRESETS_MONTHLY = [1000, 5000, 10000, 25000];

export function PlanBuilder() {
  const { amount, horizon, risk, frequency, setAmount, setHorizon, setRisk, setFrequency } = useUiStore();
  const presets = frequency === "monthly" ? PRESETS_MONTHLY : PRESETS_ONETIME;

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="font-display text-xl font-semibold tracking-tight">Tell us about yourself</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Four quick questions — we'll turn them into a plain-English plan you can act on.
        </p>

        {/* Q1: frequency (one-time vs SIP) */}
        <div className="mt-6">
          <Label className="text-sm">1. How do you want to invest?</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {FREQUENCIES.map((f) => {
              const active = frequency === f.key;
              const Icon = f.icon;
              return (
                <button
                  key={f.key}
                  onClick={() => {
                    // When switching modes, snap to a sensible default so the amount feels right.
                    if (f.key === "monthly" && amount > 50000) setAmount(10000);
                    if (f.key === "onetime" && amount < 10000) setAmount(50000);
                    setFrequency(f.key);
                  }}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    active ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {f.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{f.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q2: amount (changes label + presets based on frequency) */}
        <div className="mt-6">
          <Label className="text-sm">
            2. {frequency === "monthly" ? "How much can you invest every month?" : "How much would you like to invest?"}
          </Label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₹</span>
              <Input
                type="number"
                inputMode="numeric"
                min={500}
                step={500}
                value={amount}
                onChange={(e) => setAmount(Math.max(500, Number(e.target.value) || 0))}
                className="w-44 pl-7 font-mono"
              />
              {frequency === "monthly" && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">/mo</span>
              )}
            </div>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <Button
                  key={p}
                  size="sm"
                  variant={amount === p ? "secondary" : "ghost"}
                  onClick={() => setAmount(p)}
                  className={cn("h-8 px-2.5 text-xs", amount === p && "border-border")}
                >
                  ₹{p >= 100000 ? `${p / 100000}L` : `${p / 1000}k`}
                  {frequency === "monthly" ? "/mo" : ""}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Q3: horizon */}
        <div className="mt-6">
          <Label className="text-sm">3. How long can you leave it invested?</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {HORIZONS.map((h) => {
              const active = horizon === h.key;
              return (
                <button
                  key={h.key}
                  onClick={() => setHorizon(h.key)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    active ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    {h.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{h.sub}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Q4: risk */}
        <div className="mt-6">
          <Label className="text-sm">4. How would you feel if your investment dropped 20% in a bad month?</Label>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
            {RISKS.map((r) => {
              const active = risk === r.key;
              const Icon = r.icon;
              return (
                <button
                  key={r.key}
                  onClick={() => setRisk(r.key)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-lg border p-3 text-left transition-colors",
                    active ? "border-accent bg-accent/10" : "border-border bg-card hover:bg-muted"
                  )}
                >
                  <span className="inline-flex items-center gap-2 text-sm font-medium">
                    <Icon className="size-3.5 text-muted-foreground" />
                    {r.label}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{r.sub}</span>
                </button>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
