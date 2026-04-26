import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = withAuth<{ params: Promise<{ symbol: string }> }>(async (_req, ctx, { params }) => {
  const { symbol } = await params;
  const asset = await prisma.asset.findFirst({ where: { symbol: { equals: symbol, mode: "insensitive" } } });
  if (!asset) throw NotFound(`Asset ${symbol} not found`);

  const rows = await prisma.corporateAction.findMany({
    where: { assetId: asset.id },
    orderBy: { effectiveDate: "desc" },
  });

  return ok({
    data: rows.map((r) => ({
      date: r.effectiveDate.toISOString().slice(0, 10),
      type: r.type,
      ratio: r.ratio,
      amount: r.amount ? Number(r.amount) : null,
      notes: r.notes,
    })),
    meta: { total: rows.length },
  }, ctx);
});
