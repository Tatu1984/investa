import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";
import { renderReportPdf } from "@/backend/services/report-pdf.service";
import { sendEmail } from "@/backend/utils/email.util";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withAuth<{ params: Promise<{ date: string }> }>(async (_req, ctx, { params }) => {
  const { date: dStr } = await params;
  const d = new Date(`${dStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw NotFound(`Invalid date: ${dStr}`);

  const [report, user] = await Promise.all([
    prisma.report.findUnique({ where: { date: d } }),
    prisma.user.findUnique({ where: { id: ctx.user!.sub } }),
  ]);
  if (!report) throw NotFound(`No report for ${dStr}`);
  if (!user) throw NotFound("User not found");

  const pdf = await renderReportPdf({
    date: report.date.toISOString().slice(0, 10),
    title: report.title,
    summary: report.summary,
    sections: report.sections as unknown as Parameters<typeof renderReportPdf>[0]["sections"],
  });

  const sections = report.sections as Record<string, string>;
  const html = `
    <div style="font-family: Inter, -apple-system, Arial, sans-serif; color:#1a1f2c; max-width:640px; margin:0 auto;">
      <div style="font-size:10px; color:#7a7f8c; text-transform:uppercase; letter-spacing:1px;">Investa · Daily Brief</div>
      <h1 style="font-size:22px; margin:4px 0 16px;">${report.title}</h1>
      <p style="line-height:1.55; color:#2e3547;">${escapeHtml(report.summary)}</p>
      <h3 style="font-size:13px; color:#5a6070; margin-top:24px;">Key signals</h3>
      <p style="line-height:1.55;">${escapeHtml(sections.keySignals ?? "")}</p>
      <h3 style="font-size:13px; color:#5a6070; margin-top:24px;">Top opportunities</h3>
      <pre style="font-family:inherit; white-space:pre-wrap; line-height:1.55;">${escapeHtml(sections.topOpportunities ?? "")}</pre>
      <p style="font-size:11px; color:#8a8f99; border-top:1px solid #eaeaea; padding-top:12px; margin-top:32px;">
        Research-only. Not investment advice. The full report is attached as a PDF.
      </p>
    </div>`;

  const result = await sendEmail({
    to: user.email,
    subject: `${report.title} · Investa`,
    html,
    attachments: [{ filename: `investa-${dStr}.pdf`, content: pdf, contentType: "application/pdf" }],
  });

  return ok({ data: { to: user.email, ...result } }, ctx);
});

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}
