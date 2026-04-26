import "server-only";
import type { NextResponse } from "next/server";
import { env } from "@/config/env";

export const ACCESS_COOKIE = "investa_at";
export const REFRESH_COOKIE = "investa_rt";

interface SetOpts {
  maxAgeSec: number;
}

export function setAuthCookie(res: NextResponse, name: string, value: string, { maxAgeSec }: SetOpts) {
  res.cookies.set({
    name,
    value,
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: maxAgeSec,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

export function clearAuthCookie(res: NextResponse, name: string) {
  res.cookies.set({
    name,
    value: "",
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
    domain: env.COOKIE_DOMAIN || undefined,
  });
}

// Parse jose-style duration like "15m", "1h" into seconds for cookie max-age.
export function parseDurationToSeconds(d: string): number {
  const m = d.match(/^(\d+)\s*(s|m|h|d)$/);
  if (!m) return 900;
  const n = Number(m[1]);
  const unit = m[2];
  return unit === "s" ? n : unit === "m" ? n * 60 : unit === "h" ? n * 3600 : n * 86400;
}
