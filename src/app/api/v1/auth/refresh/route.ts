import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, ok } from "@/backend/api/middleware";
import { RULES } from "@/backend/utils/rate-limit.util";
import { authService } from "@/backend/services/auth.service";
import { env } from "@/config/env";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  parseDurationToSeconds,
  setAuthCookie,
} from "@/backend/utils/cookies.util";
import { Unauthorized } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const POST = withRateLimit(RULES.REFRESH, async (req: NextRequest, ctx) => {
  const cookieToken = req.cookies.get(REFRESH_COOKIE)?.value;
  let bodyToken: string | undefined;
  try {
    const body = await req.json().catch(() => ({}));
    if (body && typeof body.refreshToken === "string") bodyToken = body.refreshToken;
  } catch { /* empty body ok */ }
  const token = cookieToken ?? bodyToken;
  if (!token) throw Unauthorized("No refresh token");

  const result = await authService.refresh(token, { userAgent: ctx.userAgent, ipAddress: ctx.ipAddress });

  const res = ok({ user: result.user, accessToken: result.accessToken }, ctx) as NextResponse;

  setAuthCookie(res, ACCESS_COOKIE, result.accessToken, { maxAgeSec: parseDurationToSeconds(env.JWT_ACCESS_TTL) });
  setAuthCookie(res, REFRESH_COOKIE, result.refreshToken, { maxAgeSec: env.JWT_REFRESH_TTL_DAYS * 86400 });

  return res;
});
