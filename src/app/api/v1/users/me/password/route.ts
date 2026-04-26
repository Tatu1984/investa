import { NextRequest, NextResponse } from "next/server";
import { withAuth } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { ChangePasswordSchema } from "@/backend/validators/user.validator";
import { hashPassword, verifyPassword } from "@/backend/utils/hash.util";
import { refreshTokenRepository } from "@/backend/repositories/refresh-token.repository";
import { Unauthorized } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const POST = withAuth(async (req: NextRequest, ctx) => {
  const input = ChangePasswordSchema.parse(await req.json());

  const user = await prisma.user.findUnique({ where: { id: ctx.user!.sub } });
  if (!user) throw Unauthorized();

  const ok = await verifyPassword(user.passwordHash, input.currentPassword);
  if (!ok) throw Unauthorized("Current password is incorrect");

  const newHash = await hashPassword(input.newPassword);
  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: newHash } });

  // Revoke all existing refresh tokens — force re-login on other devices.
  await refreshTokenRepository.revokeAllForUser(user.id);

  return new NextResponse(null, { status: 204, headers: { "x-request-id": ctx.requestId } });
});
