import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { verifyAccessToken, type AccessTokenPayload } from "@/backend/utils/jwt.util";
import { ACCESS_COOKIE } from "@/backend/utils/cookies.util";
import { getOrCreateRequestId } from "@/backend/utils/request-id.util";
import { handleError, Unauthorized, Forbidden, json } from "@/backend/utils/error-handler.util";
import { checkAsync as rlCheckAsync, limitHeaders, type RateLimit } from "@/backend/utils/rate-limit.util";

export interface RequestContext {
  requestId: string;
  user?: AccessTokenPayload;
  userAgent: string | null;
  ipAddress: string | null;
}

function contextFromRequest(req: NextRequest, user?: AccessTokenPayload): RequestContext {
  const fwd = req.headers.get("x-forwarded-for");
  return {
    requestId: getOrCreateRequestId(req.headers),
    user,
    userAgent: req.headers.get("user-agent"),
    ipAddress: fwd ? fwd.split(",")[0]!.trim() : null,
  };
}

type Handler<Args> = (req: NextRequest, ctx: RequestContext, args: Args) => Promise<Response> | Response;

// Wrap a route handler with logging + error handling (public endpoints).
export function withApi<Args = unknown>(handler: Handler<Args>) {
  return async (req: NextRequest, args: Args) => {
    const ctx = contextFromRequest(req);
    try {
      const res = await handler(req, ctx, args);
      if (!res.headers.get("x-request-id")) res.headers.set("x-request-id", ctx.requestId);
      return res;
    } catch (err) {
      return handleError(err, ctx.requestId);
    }
  };
}

// Require a valid access token (from cookie OR Authorization header).
export function withAuth<Args = unknown>(handler: Handler<Args>) {
  return async (req: NextRequest, args: Args) => {
    const ctx = contextFromRequest(req);
    try {
      const cookieToken = req.cookies.get(ACCESS_COOKIE)?.value;
      const header = req.headers.get("authorization");
      const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
      const token = cookieToken || bearer;
      if (!token) throw Unauthorized("Missing access token");

      const payload = await verifyAccessToken(token);
      if (!payload) throw Unauthorized("Invalid or expired access token");

      ctx.user = payload;
      const res = await handler(req, ctx, args);
      if (!res.headers.get("x-request-id")) res.headers.set("x-request-id", ctx.requestId);
      return res;
    } catch (err) {
      return handleError(err, ctx.requestId);
    }
  };
}

// Require ADMIN role.
export function withAdmin<Args = unknown>(handler: Handler<Args>) {
  return withAuth<Args>(async (req, ctx, args) => {
    if (ctx.user?.role !== "ADMIN") throw Forbidden("Admin role required");
    return handler(req, ctx, args);
  });
}

// Shorthand for consistent success responses.
export const ok = <T>(data: T, ctx: RequestContext, init?: { status?: number }) =>
  json(data, { status: init?.status ?? 200, requestId: ctx.requestId });

/**
 * Rate-limit wrapper. Keys by (user.sub || ipAddress || "anon").
 * Short-circuits with 429 problem+json when the bucket is exhausted.
 */
export function withRateLimit<Args = unknown>(rule: RateLimit, handler: Handler<Args>) {
  return async (req: NextRequest, args: Args) => {
    const ctx = contextFromRequest(req);
    const cookieToken = req.cookies.get(ACCESS_COOKIE)?.value;
    const header = req.headers.get("authorization");
    const bearer = header?.startsWith("Bearer ") ? header.slice(7) : undefined;
    const token = cookieToken || bearer;
    if (token) {
      const payload = await verifyAccessToken(token);
      if (payload) ctx.user = payload;
    }
    const key = ctx.user?.sub || ctx.ipAddress || "anon";
    const r = await rlCheckAsync(key, rule);
    if (!r.allowed) {
      const res = NextResponse.json(
        {
          type: `about:blank#rate-limited`,
          title: "Too many requests",
          status: 429,
          detail: `Please retry in ${r.resetAfterSec}s`,
          requestId: ctx.requestId,
        },
        {
          status: 429,
          headers: {
            "content-type": "application/problem+json",
            "x-request-id": ctx.requestId,
            "retry-after": String(r.resetAfterSec),
            ...limitHeaders(r),
          },
        }
      );
      return res;
    }
    try {
      const res = await handler(req, ctx, args);
      for (const [k, v] of Object.entries(limitHeaders(r))) res.headers.set(k, v);
      if (!res.headers.get("x-request-id")) res.headers.set("x-request-id", ctx.requestId);
      return res;
    } catch (err) {
      return handleError(err, ctx.requestId);
    }
  };
}
