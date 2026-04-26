import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

export const GET = withAdmin(async (req: NextRequest, ctx) => {
  const limit = Math.min(200, Math.max(1, Number(req.nextUrl.searchParams.get("limit") ?? "50")));
  const full = req.nextUrl.searchParams.get("full") === "1";
  const rows = await prisma.sentEmail.findMany({ orderBy: { createdAt: "desc" }, take: limit });
  return ok(
    {
      data: rows.map((r) => ({
        id: r.id, to: r.to, subject: r.subject,
        provider: r.provider, providerId: r.providerId, status: r.status,
        error: r.error, createdAt: r.createdAt.toISOString(),
        body: full ? (r.body ?? "") : undefined,
        bodyPreview: full ? undefined : (r.body ?? "").slice(0, 2000),
      })),
      meta: { total: rows.length, full },
    },
    ctx
  );
});
