import { withAuth } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";
import { renderReportPdf } from "@/backend/services/report-pdf.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = withAuth<{ params: Promise<{ date: string }> }>(async (_req, ctx, { params }) => {
  const { date: dStr } = await params;
  const d = new Date(`${dStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw NotFound(`Invalid date: ${dStr}`);

  const r = await prisma.report.findUnique({ where: { date: d } });
  if (!r) throw NotFound(`No report for ${dStr}`);

  const pdf = await renderReportPdf({
    date: r.date.toISOString().slice(0, 10),
    title: r.title,
    summary: r.summary,
    sections: r.sections as unknown as ReturnType<Parameters<typeof renderReportPdf>[0]["sections"] extends infer T ? () => T : never>,
  });

  return new Response(new Uint8Array(pdf), {
    status: 200,
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="investa-${dStr}.pdf"`,
      "cache-control": "private, max-age=300",
      "x-request-id": ctx.requestId,
    },
  });
});
