import { NextRequest, NextResponse } from "next/server";
import { withRateLimit, ok } from "@/backend/api/middleware";
import { authService } from "@/backend/services/auth.service";
import { RegisterSchema } from "@/backend/validators/auth.validator";
import { env } from "@/config/env";
import {
  ACCESS_COOKIE,
  REFRESH_COOKIE,
  parseDurationToSeconds,
  setAuthCookie,
} from "@/backend/utils/cookies.util";
import { RULES } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

export const POST = withRateLimit(RULES.SIGNUP, async (req: NextRequest, ctx) => {
  const body = await req.json();
  const input = RegisterSchema.parse(body);

  const result = await authService.register(input, { userAgent: ctx.userAgent, ipAddress: ctx.ipAddress });

  const res = ok(
    {
      user: result.user,
      accessToken: result.accessToken,
    },
    ctx,
    { status: 201 }
  ) as NextResponse;

  setAuthCookie(res, ACCESS_COOKIE, result.accessToken, { maxAgeSec: parseDurationToSeconds(env.JWT_ACCESS_TTL) });
  setAuthCookie(res, REFRESH_COOKIE, result.refreshToken, { maxAgeSec: env.JWT_REFRESH_TTL_DAYS * 86400 });

  return res;
});
