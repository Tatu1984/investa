import { NextRequest } from "next/server";
import { env } from "@/config/env";
import { verifyAccessToken } from "@/backend/utils/jwt.util";
import { ACCESS_COOKIE } from "@/backend/utils/cookies.util";

export interface CronAuthResult {
  authed: boolean;
  triggeredBy: string;   // "cron" | "admin:<userId>" | "unauthenticated"
  reason?: string;
}

/**
 * Accepts either:
 *   1. `Authorization: Bearer <CRON_SECRET>` — what Vercel Cron sends
 *   2. A valid ADMIN JWT cookie — for manual re-runs from the admin console
 */
export async function verifyCronCaller(req: NextRequest): Promise<CronAuthResult> {
  // 1. Vercel Cron path
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ") && env.CRON_SECRET) {
    if (auth.slice(7) === env.CRON_SECRET) {
      return { authed: true, triggeredBy: "cron" };
    }
  }

  // 2. Admin cookie path
  const token = req.cookies.get(ACCESS_COOKIE)?.value;
  if (token) {
    const payload = await verifyAccessToken(token);
    if (payload?.role === "ADMIN") return { authed: true, triggeredBy: `admin:${payload.sub}` };
  }

  return { authed: false, triggeredBy: "unauthenticated", reason: "Missing or invalid cron/admin auth" };
}
