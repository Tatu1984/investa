import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const subTypes = sp.getAll("subType").filter(Boolean);
  const types = sp.getAll("type").filter(Boolean);
  const limit = Math.min(50, Math.max(1, Number(sp.get("limit") ?? "25") || 25));

  // q is optional when subType / type filters are provided (e.g. browse-by-category).
  if (!q && subTypes.length === 0 && types.length === 0) return ok({ data: [] }, ctx);

  const where: Record<string, unknown> = {};
  if (q) {
    where.OR = [
      { symbol: { contains: q, mode: "insensitive" } },
      { name:   { contains: q, mode: "insensitive" } },
    ];
  }
  if (subTypes.length) where.subType = { in: subTypes };
  if (types.length)    where.type    = { in: types };

  const rows = await prisma.asset.findMany({
    where,
    take: limit,
    orderBy: [{ symbol: "asc" }],
    select: { id: true, symbol: true, name: true, type: true, subType: true, sector: true, exchange: true },
  });

  return ok({ data: rows, meta: { total: rows.length, q, subTypes, types } }, ctx);
});
