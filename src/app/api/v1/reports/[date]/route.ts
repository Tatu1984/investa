import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = withAuth<{ params: Promise<{ date: string }> }>(async (_req, ctx, { params }) => {
  const { date: dStr } = await params;
  const d = new Date(`${dStr}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) throw NotFound(`Invalid report date: ${dStr}`);

  const r = await prisma.report.findUnique({ where: { date: d } });
  if (!r) throw NotFound(`No report for ${dStr}`);

  return ok({
    data: {
      date: r.date.toISOString().slice(0, 10),
      title: r.title,
      summary: r.summary,
      sections: r.sections,
      publishedAt: r.publishedAt?.toISOString() ?? null,
      status: r.status,
    },
  }, ctx);
});
