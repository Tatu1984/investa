import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = withAuth<{ params: Promise<{ symbol: string }> }>(async (_req, ctx, { params }) => {
  const { symbol } = await params;
  const asset = await prisma.asset.findFirst({ where: { symbol: { equals: symbol, mode: "insensitive" } } });
  if (!asset) throw NotFound(`Asset ${symbol} not found`);

  const rows = await prisma.signalsDaily.findMany({
    where: { assetId: asset.id },
    orderBy: { date: "desc" },
    take: 120,
  });

  return ok({
    data: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      signal: r.signal,
      probability: r.probability,
      confidence: Number(r.confidence),
      rationale: r.rationale,
      modelVersion: r.modelVersion,
    })),
    meta: { symbol: asset.symbol, total: rows.length },
  }, ctx);
});
