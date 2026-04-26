import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

export const GET = withAdmin(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const source = sp.get("source") ?? undefined;
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")));

  const rows = await prisma.ingestLog.findMany({
    where: source ? { source } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return ok({ data: rows, meta: { total: rows.length } }, ctx);
});
