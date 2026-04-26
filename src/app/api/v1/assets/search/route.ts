import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 1) return ok({ data: [] }, ctx);

  const rows = await prisma.asset.findMany({
    where: {
      OR: [
        { symbol: { contains: q, mode: "insensitive" } },
        { name:   { contains: q, mode: "insensitive" } },
      ],
    },
    take: 25,
    orderBy: [
      // Exact symbol match first, then alphabetical
      { symbol: "asc" },
    ],
    select: { id: true, symbol: true, name: true, type: true, sector: true, exchange: true },
  });

  return ok({ data: rows, meta: { total: rows.length, q } }, ctx);
});
