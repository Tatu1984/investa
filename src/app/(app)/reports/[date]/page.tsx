"use client";
import * as React from "react";
import Link from "next/link";
import { use } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { AxiosError } from "axios";
import { ArrowLeft, Download, Mail, AlertCircle, CheckCircle2, Info } from "lucide-react";
import { PageHeader } from "@/frontend/components/layout/PageHeader";
import { Button } from "@/frontend/components/ui/Button";
import { Card, CardContent } from "@/frontend/components/ui/Card";
import { FadeIn } from "@/frontend/components/motion/FadeIn";
import { reportsApi, type EmailResult } from "@/frontend/api/endpoints/reports.api";

const SECTION_TITLES: Record<string, string> = {
  marketOverview: "Market overview",
  keySignals: "Key signals",
  topOpportunities: "Top opportunities",
  avoidList: "Avoid / caution list",
  sectorView: "Sector view",
  allocation: "Asset allocation suggestion",
};

function msg(e: unknown) {
  if (e instanceof AxiosError) {
    const d = e.response?.data as { detail?: string } | undefined;
    return d?.detail ?? e.message;
  }
  return e instanceof Error ? e.message : "Something went wrong";
}

export default function ReportDetailPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = use(params);
  const { data: r, isLoading, error } = useQuery({ queryKey: ["reports", date], queryFn: () => reportsApi.byDate(date) });

  const [notice, setNotice] = React.useState<{ kind: "success" | "info" | "error"; text: string } | null>(null);
  const emailMut = useMutation({
    mutationFn: () => reportsApi.emailSelf(date),
    onSuccess: (res: EmailResult) => {
      setNotice(
        res.status === "sent"
          ? { kind: "success", text: `Sent to ${res.to} via ${res.provider}.` }
          : res.status === "stub"
            ? { kind: "info", text: "Email captured in stub mode (RESEND_API_KEY not set)." }
            : { kind: "error", text: `Failed: ${res.error ?? "unknown"}` }
      );
      setTimeout(() => setNotice(null), 8000);
    },
    onError: (e) => { setNotice({ kind: "error", text: msg(e) }); setTimeout(() => setNotice(null), 8000); },
  });

  return (
    <FadeIn>
      <div className="mb-4">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/reports"><ArrowLeft className="size-4" /> Back to reports</Link>
        </Button>
      </div>

      {isLoading && <div className="h-80 rounded-xl border border-border bg-card shimmer" />}
      {error && (
        <Card><CardContent className="flex items-center gap-2 p-6 text-sm">
          <AlertCircle className="size-5 text-[color-mix(in_oklab,var(--destructive)_75%,var(--foreground))]" /> Report not found.
        </CardContent></Card>
      )}

      {r && (
        <>
          <PageHeader
            title={r.title}
            description={`Published ${r.date} · Indian Markets · EOD`}
            actions={
              <>
                <Button variant="outline" size="sm" onClick={() => emailMut.mutate()} disabled={emailMut.isPending}>
                  <Mail className="size-4" /> {emailMut.isPending ? "Sending…" : "Email"}
                </Button>
                <Button asChild size="sm">
                  <a href={reportsApi.pdfUrl(r.date)} target="_blank" rel="noopener noreferrer">
                    <Download className="size-4" /> PDF
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

          <Card className="mb-5"><CardContent className="p-6">
            <h3 className="text-sm font-semibold">Executive summary</h3>
            <p className="mt-2 text-base leading-relaxed text-foreground/90">{r.summary}</p>
          </CardContent></Card>

          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
            {Object.entries(r.sections).map(([k, v]) => (
              <Card key={k}><CardContent className="p-5">
                <h3 className="text-sm font-semibold tracking-tight">{SECTION_TITLES[k] ?? k}</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{String(v)}</p>
              </CardContent></Card>
            ))}
          </div>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Research-only. Past performance is not a guarantee of future results.
          </p>
        </>
      )}
    </FadeIn>
  );
}
