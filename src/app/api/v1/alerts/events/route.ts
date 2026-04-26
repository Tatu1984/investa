import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

/**
 * Alert events for the current user.
 *   ?since=ISO  → only events triggered after that time
 *   ?limit=     → cap (default 50, max 200)
 *   ?alertId=   → only this alert
 */
export const GET = withAuth(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const sinceStr = sp.get("since");
  const limit = Math.min(200, Math.max(1, Number(sp.get("limit") ?? "50")));
  const alertId = sp.get("alertId") ?? undefined;

  const since = sinceStr ? new Date(sinceStr) : null;

  const rows = await prisma.alertEvent.findMany({
    where: {
      alert: { userId: ctx.user!.sub, ...(alertId ? { id: alertId } : {}) },
      ...(since && !Number.isNaN(since.getTime()) ? { triggeredAt: { gt: since } } : {}),
    },
    include: { alert: { select: { id: true, symbol: true, type: true, channel: true } } },
    orderBy: { triggeredAt: "desc" },
    take: limit,
  });

  return ok(
    {
      data: rows.map((r) => ({
        id: r.id,
        alertId: r.alertId,
        symbol: r.alert.symbol,
        type: r.alert.type,
        channel: r.alert.channel,
        triggeredAt: r.triggeredAt.toISOString(),
        payload: r.payload,
      })),
      meta: { total: rows.length, since: since?.toISOString() ?? null },
    },
    ctx
  );
});
