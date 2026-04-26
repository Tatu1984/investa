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
  /**
   * Resumable steps return `{ done, nextCursor }` and we loop until done.
   * Necessary for long-running backfills that can't fit in Vercel's 60s
   * function cap in a single call.
   */
  resumable?: boolean;
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
    description: "Pulls 1Y of daily OHLC for every equity. Long-running — runs in resumable chunks of ~50s each.",
    path: "/api/v1/admin/backfill/nse?range=1y",
    eta: "~5–8 min (chunked)",
    resumable: true,
  },
  {
    key: "mf-backfill",
    label: "Backfill 1 year of mutual fund NAV history (mfapi.in)",
    description: "1Y of daily NAVs for the top 300 Direct-Growth schemes. Resumable.",
    path: "/api/v1/admin/backfill/mf",
    eta: "~2–4 min (chunked)",
    resumable: true,
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
  /** For resumable steps — last reported cumulative progress. */
  progress?: { processed: number; total: number; calls: number };
}

export function BootstrapPanel() {
  const [results, setResults] = React.useState<Record<string, StepResult>>(
    Object.fromEntries(STEPS.map((s) => [s.key, { status: "pending" as StepStatus }]))
  );
  const [running, setRunning] = React.useState(false);

  /**
   * Single POST to a step's endpoint, with cursor support for resumable steps.
   * Returns { ok, payload } so the caller can decide whether to loop.
   */
  async function callOnce(path: string): Promise<{ ok: boolean; payload: unknown; reason?: string }> {
    const res = await fetch(path, {
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
      return { ok: false, payload, reason };
    }
    return { ok: true, payload };
  }

  async function runStep(step: Step) {
    setResults((r) => ({ ...r, [step.key]: { ...r[step.key], status: "running", startedAt: Date.now() } }));

    // Non-resumable: single call.
    if (!step.resumable) {
      const { ok, payload, reason } = await callOnce(step.path).catch((e) => ({
        ok: false as const, payload: null, reason: e instanceof Error ? e.message : String(e),
      }));
      setResults((r) => ({
        ...r,
        [step.key]: ok
          ? { status: "ok", finishedAt: Date.now(), startedAt: r[step.key]?.startedAt, payload }
          : { status: "failed", finishedAt: Date.now(), startedAt: r[step.key]?.startedAt, message: reason, payload },
      }));
      return ok;
    }

    // Resumable: loop until { done: true } or a hard error.
    const sep = step.path.includes("?") ? "&" : "?";
    let cursor: string | null = null;
    let calls = 0;
    let lastPayload: unknown = null;
    const safetyLimit = 30; // far more than needed; protects against accidental infinite loops

    while (calls < safetyLimit) {
      const url = cursor ? `${step.path}${sep}cursor=${encodeURIComponent(cursor)}` : step.path;
      let result: { ok: boolean; payload: unknown; reason?: string };
      try {
        result = await callOnce(url);
      } catch (e) {
        result = { ok: false, payload: null, reason: e instanceof Error ? e.message : String(e) };
      }
      calls++;
      lastPayload = result.payload;

      if (!result.ok) {
        setResults((r) => ({
          ...r,
          [step.key]: {
            status: "failed",
            finishedAt: Date.now(),
            startedAt: r[step.key]?.startedAt,
            message: `Call ${calls} failed: ${result.reason}`,
            payload: result.payload,
            progress: r[step.key]?.progress,
          },
        }));
        return false;
      }

      const p = result.payload as { done?: boolean; nextCursor?: string | null; processed?: number; total?: number } | null;
      const processed = (p?.processed ?? 0);
      const total = (p?.total ?? 0);
      // Cumulative progress = total - rows still past the current cursor.
      // Easier to just show total - remaining — server already reports `processed`
      // for *this call*, so we accumulate across calls as best we can.
      setResults((r) => {
        const prev = r[step.key]?.progress ?? { processed: 0, total, calls: 0 };
        return {
          ...r,
          [step.key]: {
            ...r[step.key],
            status: "running",
            payload: result.payload,
            progress: { processed: prev.processed + processed, total: total || prev.total, calls },
          },
        };
      });

      if (p?.done || !p?.nextCursor) {
        setResults((r) => ({
          ...r,
          [step.key]: {
            ...r[step.key],
            status: "ok",
            finishedAt: Date.now(),
            payload: lastPayload,
          },
        }));
        return true;
      }
      cursor = p.nextCursor;
      // Small breath between calls — be polite to upstream APIs.
      await new Promise((r) => setTimeout(r, 500));
    }

    setResults((r) => ({
      ...r,
      [step.key]: {
        ...r[step.key],
        status: "failed",
        finishedAt: Date.now(),
        message: `Aborted after ${safetyLimit} calls — investigate progress in the response payload.`,
        payload: lastPayload,
      },
    }));
    return false;
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
                  {r.progress && r.status === "running" && r.progress.total > 0 && (
                    <div className="mt-2">
                      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                        <span>
                          {r.progress.processed.toLocaleString()} / {r.progress.total.toLocaleString()} · call {r.progress.calls}
                        </span>
                        <span>{Math.round((r.progress.processed / Math.max(1, r.progress.total)) * 100)}%</span>
                      </div>
                      <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full bg-accent transition-all"
                          style={{ width: `${Math.min(100, Math.round((r.progress.processed / Math.max(1, r.progress.total)) * 100))}%` }}
                        />
                      </div>
                    </div>
                  )}
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
