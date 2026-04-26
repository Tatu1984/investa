import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const limit = Math.min(100, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "30")));
  const rows = await prisma.report.findMany({
    where: { status: "published" },
    orderBy: { date: "desc" },
    take: limit,
  });
  return ok({
    data: rows.map((r) => ({
      date: r.date.toISOString().slice(0, 10),
      title: r.title,
      summary: r.summary,
      sections: r.sections,
      publishedAt: r.publishedAt?.toISOString() ?? null,
    })),
    meta: { total: rows.length },
  }, ctx);
});
