import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { UpdateMeSchema } from "@/backend/validators/user.validator";
import { Conflict } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const PATCH = withAuth(async (req: NextRequest, ctx) => {
  const input = UpdateMeSchema.parse(await req.json());
  if (input.email) {
    const existing = await prisma.user.findFirst({ where: { email: input.email, NOT: { id: ctx.user!.sub } } });
    if (existing) throw Conflict("Email already in use");
  }
  const u = await prisma.user.update({
    where: { id: ctx.user!.sub },
    data: input,
    select: { id: true, email: true, name: true, role: true },
  });
  return ok({ user: u }, ctx);
});
