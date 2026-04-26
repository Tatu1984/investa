import { NextRequest, NextResponse } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { UpdateAlertSchema } from "@/backend/validators/alert.validator";
import { NotFound, Forbidden } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

async function ownedOr404(userId: string, id: string) {
  const a = await prisma.alert.findUnique({ where: { id } });
  if (!a) throw NotFound(`Alert ${id} not found`);
  if (a.userId !== userId) throw Forbidden("Not your alert");
  return a;
}

export const PATCH = withAuth<{ params: Promise<{ id: string }> }>(async (req: NextRequest, ctx, { params }) => {
  const { id } = await params;
  await ownedOr404(ctx.user!.sub, id);
  const input = UpdateAlertSchema.parse(await req.json());
  const a = await prisma.alert.update({ where: { id }, data: input });
  return ok({ data: { id: a.id, symbol: a.symbol, type: a.type, threshold: a.threshold, channel: a.channel, active: a.active } }, ctx);
});

export const DELETE = withAuth<{ params: Promise<{ id: string }> }>(async (_req, ctx, { params }) => {
  const { id } = await params;
  await ownedOr404(ctx.user!.sub, id);
  await prisma.alert.delete({ where: { id } });
  return new NextResponse(null, { status: 204, headers: { "x-request-id": ctx.requestId } });
});
