"use client";
import * as React from "react";
import Link from "next/link";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { FileText, Download, Mail, ArrowUpRight, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Button } from "@/frontend/components/ui/Button";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { reportsApi, type EmailResult } from "@/frontend/api/endpoints/reports.api";

function msg(e: unknown) {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string } | undefined;
    return d?.detail ?? e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

export default function ReportsPage() {
  const { data = [], isLoading, error } = useQuery({ queryKey: ["reports"], queryFn: () => reportsApi.list(30) });
  const latest = data[0];
  const [notice, setNotice] = React.useState<{ kind: "success" | "info" | "error"; text: string } | null>(null);

  const emailMut = useMutation({
    mutationFn: () => reportsApi.emailSelf(latest!.date),
    onSuccess: (r: EmailResult) => {
      setNotice(
        r.status === "sent"
          ? { kind: "success", text: `Sent to ${r.to} via ${r.provider}.` }
          : r.status === "stub"
            ? { kind: "info", text: `Email captured in stub mode (RESEND_API_KEY not set). Admin → /api/v1/admin/emails to inspect.` }
            : { kind: "error", text: `Failed: ${r.error ?? "unknown"}` }
      );
      setTimeout(() => setNotice(null), 8000);
    },
    onError: (e) => {
      setNotice({ kind: "error", text: msg(e) });
      setTimeout(() => setNotice(null), 8000);
    },
  });

  const pdfDisabled = !latest;
  const emailDisabled = !latest || emailMut.isPending;

  return (
    <FadeIn>
      <PageHeader
        title="Reports"
        description="Automated daily intelligence briefs. Built from real signals + features + regime."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => emailMut.mutate()}
              disabled={emailDisabled}
            >
              <Mail className="size-4" /> {emailMut.isPending ? "Sending…" : "Email me latest"}
            </Button>
            <Button asChild size="sm" disabled={pdfDisabled}>
              <a
                href={latest ? reportsApi.pdfUrl(latest.date) : "#"}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={pdfDisabled}
              >
                <Download className="size-4" /> Download PDF
              </a>
            </Button>
          </>
        }
      />

      {notice && (
        <div
          className={
            "mb-4 flex items-start gap-2 rounded-md border px-3 py-2 text-xs " +
            (notice.kind === "success"
              ? "border-[color-mix(in_oklab,var(--success)_40%,transparent)] bg-[color-mix(in_oklab,var(--success)_10%,transparent)]"
              : notice.kind === "info"
                ? "border-border bg-muted/40"
                : "border-destructive/30 bg-[color-mix(in_oklab,var(--destructive)_10%,transparent)]")
          }
        >
          {notice.kind === "success" ? <CheckCircle2 className="mt-0.5 size-3.5 shrink-0" />
            : notice.kind === "info" ? <Info className="mt-0.5 size-3.5 shrink-0" />
            : <AlertCircle className="mt-0.5 size-3.5 shrink-0" />}
          <span>{notice.text}</span>
        </div>
      )}

      {isLoading && <div className="h-48 rounded-xl border border-border bg-card shimmer" />}

      {error && (
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm">
          <AlertCircle className="size-5 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" /> Couldn't load reports.
        </CardContent></Card>
      )}

      {!isLoading && !error && data.length === 0 && (
        <Card><CardContent className="p-8 text-center text-sm text-muted-foreground">
          No reports published yet. Run <code>POST /api/v1/admin/reports/build</code> or wait for the 23:00 IST cron.
        </CardContent></Card>
      )}

      {!isLoading && !error && latest && (() => {
        const rest = data.slice(1);
        return (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Latest report</div>
                    <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{latest.title}</h2>
                  </div>
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/reports/${latest.date}`}>Open <ArrowUpRight className="size-3.5" /></Link>
                  </Button>
                </div>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{latest.summary}</p>
                <div className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2">
                  {Object.entries(latest.sections).slice(0, 4).map(([k, v]) => (
                    <div key={k} className="rounded-lg border border-border bg-muted/30 p-4">
                      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{k.replace(/([A-Z])/g, " $1")}</div>
                      <div className="mt-1 whitespace-pre-wrap text-sm leading-relaxed">{String(v)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-5">
                <h3 className="text-sm font-semibold">Archive</h3>
                <ul className="mt-3 space-y-2">
                  {[latest, ...rest].map((r) => (
                    <li key={r.date}>
                      <Link href={`/reports/${r.date}`} className="flex items-start justify-between rounded-md p-2 transition-colors hover:bg-muted">
                        <div className="flex items-start gap-3">
                          <span className="mt-0.5 flex size-7 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            <FileText className="size-3.5" />
                          </span>
                          <div>
                            <div className="text-sm font-medium">{r.date}</div>
                            <div className="text-[11px] text-muted-foreground line-clamp-2 max-w-xs">{r.title}</div>
                          </div>
                        </div>
                        <ArrowUpRight className="size-3.5 text-muted-foreground" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        );
      })()}
    </FadeIn>
  );
}
