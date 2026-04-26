import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { CreateAlertSchema } from "@/backend/validators/alert.validator";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const rows = await prisma.alert.findMany({
    where: { userId: ctx.user!.sub },
    orderBy: { createdAt: "desc" },
  });
  return ok({
    data: rows.map((a) => ({
      id: a.id,
      symbol: a.symbol,
      type: a.type,
      threshold: a.threshold,
      channel: a.channel,
      active: a.active,
      createdAt: a.createdAt.toISOString(),
    })),
    meta: { total: rows.length },
  }, ctx);
});

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const input = CreateAlertSchema.parse(await req.json());
  const a = await prisma.alert.create({
    data: {
      userId: ctx.user!.sub,
      symbol: input.symbol,
      type: input.type,
      threshold: input.threshold,
      channel: input.channel,
      active: input.active,
    },
  });
  return ok(
    {
      data: {
        id: a.id, symbol: a.symbol, type: a.type,
        threshold: a.threshold, channel: a.channel, active: a.active,
        createdAt: a.createdAt.toISOString(),
      },
    },
    ctx,
    { status: 201 }
  );
});
