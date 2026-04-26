import { NextRequest, NextResponse } from "next/server";
import { withApi } from "@/backend/api/middleware";
import { authService } from "@/backend/services/auth.service";
import { ACCESS_COOKIE, REFRESH_COOKIE, clearAuthCookie } from "@/backend/utils/cookies.util";

export const runtime = "nodejs";

export const POST = withApi(async (req: NextRequest, ctx) => {
  const token = req.cookies.get(REFRESH_COOKIE)?.value;
  await authService.logout(token);

  const res = new NextResponse(null, { status: 204, headers: { "x-request-id": ctx.requestId } });
  clearAuthCookie(res, ACCESS_COOKIE);
  clearAuthCookie(res, REFRESH_COOKIE);
  return res;
});
