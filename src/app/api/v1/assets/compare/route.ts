import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { z } from "zod";

export const runtime = "nodejs";

const Body = z.object({
  symbols: z.array(z.string().min(1)).min(1).max(6),
  range: z.enum(["1M", "3M", "6M", "1Y", "3Y", "5Y"]).default("3M"),
});

const RANGE_DAYS: Record<string, number> = { "1M": 30, "3M": 90, "6M": 180, "1Y": 365, "3Y": 365 * 3, "5Y": 365 * 5 };

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const body = Body.parse(await req.json());
  const days = RANGE_DAYS[body.range] ?? 90;
  const since = new Date(Date.now() - days * 86400 * 1000);

  const assets = await prisma.asset.findMany({ where: { symbol: { in: body.symbols.map((s) => s.toUpperCase()) } } });

  const series = await Promise.all(
    assets.map(async (a) => {
      const isMf = a.type === "mf";
      const raw = isMf
        ? (await prisma.mfNav.findMany({ where: { assetId: a.id, ts: { gte: since } }, orderBy: { ts: "asc" }, select: { ts: true, nav: true } })).map((p) => ({ ts: p.ts, v: Number(p.nav) }))
        : (await prisma.assetPrice.findMany({ where: { assetId: a.id, ts: { gte: since } }, orderBy: { ts: "asc" }, select: { ts: true, close: true } })).map((p) => ({ ts: p.ts, v: Number(p.close) }));
      if (raw.length === 0) return { symbol: a.symbol, name: a.name, points: [] };
      const base = raw[0]!.v;
      return {
        symbol: a.symbol,
        name: a.name,
        points: raw.map((p) => ({
          date: p.ts.toISOString().slice(0, 10),
          pct: Number((((p.v - base) / base) * 100).toFixed(3)),
          raw: p.v,
        })),
      };
    })
  );

  return ok({ data: series, meta: { range: body.range, symbolsResolved: series.length } }, ctx);
});
