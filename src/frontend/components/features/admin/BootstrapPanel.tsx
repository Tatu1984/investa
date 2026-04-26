"use client";
import * as React from "react";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { Button } from "@/frontend/components/ui/Button";
import { Badge } from "@/frontend/components/ui/Badge";
import { CheckCircle2, AlertCircle, Loader2, PlayCircle, RefreshCw } from "lucide-react";
import { cn } from "@/frontend/utils/cn";

type StepStatus = "pending" | "running" | "ok" | "failed" | "skipped";

interface Step {
  key: string;
  label: string;
  description: string;
  /** Path + method for the admin endpoint. */
  path: string;
  /** Estimated runtime — used for the explainer copy only. */
  eta: string;
}

const STEPS: Step[] = [
  {
    key: "nse",
    label: "Ingest NSE bhavcopy",
    description: "Latest end-of-day prices for ~2,700 NSE equities (creates Asset rows + today's price).",
    path: "/api/v1/admin/ingest/nse",
    eta: "~15–30 sec",
  },
  {
    key: "amfi",
    label: "Ingest AMFI mutual fund NAVs",
    description: "Latest NAV for every Indian mutual fund scheme (creates MF Asset rows).",
    path: "/api/v1/admin/ingest/amfi",
    eta: "~30–60 sec",
  },
  {
    key: "yahoo-backfill",
    label: "Backfill 1 year of NSE price history (Yahoo)",
    description: "Pulls 1Y of daily OHLC for every equity. Needed by the rule engine to compute returns, MAs and signals.",
    path: "/api/v1/admin/backfill/nse?range=1y",
    eta: "~5–10 min — be patient",
  },
  {
    key: "mf-backfill",
    label: "Backfill 1 year of mutual fund NAV history (mfapi.in)",
    description: "1Y of daily NAVs for the top 300 Direct-Growth schemes.",
    path: "/api/v1/admin/backfill/mf",
    eta: "~2–4 min",
  },
  {
    key: "reclassify",
    label: "Classify assets by category",
    description: "Buckets every asset into largeCap / midCap / smallCap (equities) and fund-category (MFs) for filtering.",
    path: "/api/v1/admin/reclassify",
    eta: "~5 sec",
  },
  {
    key: "analytics",
    label: "Run analytics + AI narration",
    description: "Computes features → signals (BUY/HOLD/AVOID) → market regime → top-pick narration via Gemini/Groq/Anthropic.",
    path: "/api/v1/admin/analytics/run",
    eta: "~30–90 sec",
  },
];

interface StepResult {
  status: StepStatus;
  startedAt?: number;
  finishedAt?: number;
  message?: string;
  payload?: unknown;
}

export function BootstrapPanel() {
  const [results, setResults] = React.useState<Record<string, StepResult>>(
    Object.fromEntries(STEPS.map((s) => [s.key, { status: "pending" as StepStatus }]))
  );
  const [running, setRunning] = React.useState(false);

  async function runStep(step: Step) {
    setResults((r) => ({ ...r, [step.key]: { ...r[step.key], status: "running", startedAt: Date.now() } }));
    try {
      const res = await fetch(step.path, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
      });
      const text = await res.text();
      let payload: unknown = null;
      try { payload = text ? JSON.parse(text) : null; } catch { payload = text; }

      if (!res.ok) {
        const reason =
          (payload && typeof payload === "object" && "title" in (payload as Record<string, unknown>)
            ? String((payload as Record<string, unknown>).title)
            : "") || `HTTP ${res.status}`;
        setResults((r) => ({
          ...r,
          [step.key]: { status: "failed", finishedAt: Date.now(), startedAt: r[step.key]?.startedAt, message: reason, payload },
        }));
        return false;
      }
      setResults((r) => ({
        ...r,
        [step.key]: { status: "ok", finishedAt: Date.now(), startedAt: r[step.key]?.startedAt, payload },
      }));
      return true;
    } catch (e) {
      setResults((r) => ({
        ...r,
        [step.key]: {
          status: "failed",
          finishedAt: Date.now(),
          startedAt: r[step.key]?.startedAt,
          message: e instanceof Error ? e.message : String(e),
        },
      }));
      return false;
    }
  }

  async function runAll() {
    setRunning(true);
    setResults(Object.fromEntries(STEPS.map((s) => [s.key, { status: "pending" }])));
    for (const step of STEPS) {
      const ok = await runStep(step);
      if (!ok) break; // stop on first failure — later steps depend on earlier ones
    }
    setRunning(false);
  }

  const totalDone = Object.values(results).filter((r) => r.status === "ok").length;
  const anyFailed = Object.values(results).some((r) => r.status === "failed");

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-display text-xl font-semibold tracking-tight">First-time bootstrap</h2>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
                The data pipeline is built around a daily cron — but on a fresh deploy nothing has run yet, so
                every page reads from an empty database. Click the button below to run the full ingest +
                classification + analytics pipeline once. Total runtime: roughly{" "}
                <strong className="text-foreground">8–15 minutes</strong>. Safe to re-run any time.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <Button
                onClick={runAll}
                disabled={running}
                size="lg"
                className="gap-2"
              >
                {running ? (
                  <><Loader2 className="size-4 animate-spin" /> Running…</>
                ) : anyFailed ? (
                  <><RefreshCw className="size-4" /> Retry pipeline</>
                ) : (
                  <><PlayCircle className="size-4" /> Run full bootstrap</>
                )}
              </Button>
              <span className="text-xs text-muted-foreground">{totalDone}/{STEPS.length} done</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {STEPS.map((step, i) => {
          const r = results[step.key]!;
          const dur = r.startedAt && r.finishedAt ? Math.round((r.finishedAt - r.startedAt) / 1000) : null;
          return (
            <Card key={step.key} className={cn(
              r.status === "running" && "ring-1 ring-accent/40",
              r.status === "ok" && "border-[color-mix(in_oklab,var(--success)_50%,var(--border))]",
              r.status === "failed" && "border-[color-mix(in_oklab,var(--destructive)_50%,var(--border))]",
            )}>
              <CardContent className="flex items-start gap-4 p-5">
                <div className="mt-0.5 shrink-0">
                  {r.status === "running" && <Loader2 className="size-5 animate-spin text-accent-foreground" />}
                  {r.status === "ok" && <CheckCircle2 className="size-5 text-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]" />}
                  {r.status === "failed" && <AlertCircle className="size-5 text-[color-mix(in_oklab,var(--destructive)_70%,var(--foreground))]" />}
                  {r.status === "pending" && (
                    <div className="grid size-5 place-items-center rounded-full border border-border text-[10px] text-muted-foreground">
                      {i + 1}
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium">{step.label}</span>
                    <Badge variant={r.status === "ok" ? "buy" : r.status === "failed" ? "avoid" : "info"} className="text-[10px]">
                      {r.status === "pending" && step.eta}
                      {r.status === "running" && "Running…"}
                      {r.status === "ok" && (dur != null ? `${dur}s · done` : "done")}
                      {r.status === "failed" && "failed"}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                  {r.message && (
                    <p className="mt-2 rounded-md border border-[color-mix(in_oklab,var(--destructive)_30%,var(--border))] bg-[color-mix(in_oklab,var(--destructive)_8%,transparent)] p-2 text-xs">
                      <strong>Error:</strong> {r.message}
                    </p>
                  )}
                  {r.payload != null && r.status === "ok" && (
                    <details className="mt-2 text-xs text-muted-foreground">
                      <summary className="cursor-pointer hover:text-foreground">Show response</summary>
                      <pre className="mt-1 max-h-48 overflow-auto rounded-md bg-muted/40 p-2 text-[10px] leading-relaxed">
                        {JSON.stringify(r.payload, null, 2)}
                      </pre>
                    </details>
                  )}
                </div>
                {!running && r.status !== "running" && (
                  <Button size="sm" variant="ghost" onClick={() => runStep(step)} className="shrink-0">
                    Run only this
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {totalDone === STEPS.length && !anyFailed && (
        <Card className="border-[color-mix(in_oklab,var(--success)_60%,var(--border))]">
          <CardContent className="p-5">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 size-5 text-[color-mix(in_oklab,var(--success)_70%,var(--foreground))]" />
              <div>
                <div className="font-medium">All set — your dashboard is live</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Visit <a className="underline" href="/for-you">For You</a> to see today&apos;s picks,{" "}
                  <a className="underline" href="/compare">Compare</a> to chart assets head-to-head, or{" "}
                  <a className="underline" href="/signals">Signals</a> for the full BUY/HOLD/AVOID list.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
