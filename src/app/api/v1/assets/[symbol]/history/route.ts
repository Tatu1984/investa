import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

const RANGE_DAYS: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 365 * 3, "5Y": 365 * 5, "ALL": 36500 };

export const GET = withAuth<{ params: Promise<{ symbol: string }> }>(async (req, ctx, { params }) => {
  const { symbol } = await params;
  const asset = await prisma.asset.findFirst({ where: { symbol: { equals: symbol, mode: "insensitive" } } });
  if (!asset) throw NotFound(`Asset ${symbol} not found`);

  const range = (req.nextUrl.searchParams.get("range") ?? "3M").toUpperCase();
  const days = RANGE_DAYS[range] ?? 90;
  const since = new Date(Date.now() - days * 86400 * 1000);

  const isMf = asset.type === "mf";
  const series = isMf
    ? (await prisma.mfNav.findMany({
        where: { assetId: asset.id, ts: { gte: since } },
        orderBy: { ts: "asc" },
        select: { ts: true, nav: true },
      })).map((r) => ({ date: r.ts.toISOString().slice(0, 10), price: Number(r.nav) }))
    : (await prisma.assetPrice.findMany({
        where: { assetId: asset.id, ts: { gte: since } },
        orderBy: { ts: "asc" },
        select: { ts: true, open: true, high: true, low: true, close: true, volume: true },
      })).map((r) => ({
        date: r.ts.toISOString().slice(0, 10),
        open: Number(r.open), high: Number(r.high), low: Number(r.low),
        price: Number(r.close),
        volume: Number(r.volume),
      }));

  return ok({ data: series, meta: { symbol: asset.symbol, type: asset.type, range, count: series.length } }, ctx);
});
