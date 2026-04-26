import { NextResponse } from "next/server";
import { prisma } from "@/backend/database/client";
import { rateLimitBackend } from "@/backend/utils/rate-limit.util";
import { env } from "@/config/env";

export const runtime = "nodejs";

/**
 * Public status endpoint — for uptime checks (BetterStack, Pingdom, etc.).
 * No auth, but only exposes safe fields + cache-control no-store so middleboxes don't cache.
 */
export async function GET() {
  let dbStatus: "ok" | "down" = "down";
  let dbLatencyMs: number | null = null;

  try {
    const start = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - start;
    dbStatus = "ok";
  } catch {
    /* leave defaults */
  }

  const [lastIngest, lastSignals, lastReport, rlBackend] = await Promise.all([
    prisma.ingestLog.findFirst({ orderBy: { createdAt: "desc" }, select: { source: true, createdAt: true, durationMs: true, errors: true } }).catch(() => null),
    prisma.signalsDaily.findFirst({ orderBy: { date: "desc" }, select: { date: true } }).catch(() => null),
    prisma.report.findFirst({ orderBy: { date: "desc" }, where: { status: "published" }, select: { date: true, title: true } }).catch(() => null),
    rateLimitBackend(),
  ]);

  const overall = dbStatus === "ok" ? "ok" : "degraded";

  // Diagnostic flags — boolean only, never values. Helps debug env-var issues
  // post-deploy without leaking secrets.
  const envFlags = {
    APP_URL: !!env.APP_URL && env.APP_URL !== "http://localhost:3000",
    APP_VERSION: !!env.APP_VERSION,
    DATABASE_URL: !!env.DATABASE_URL,
    JWT_ACCESS_SECRET: !!env.JWT_ACCESS_SECRET,
    JWT_REFRESH_SECRET: !!env.JWT_REFRESH_SECRET,
    CRON_SECRET: !!env.CRON_SECRET,
    COOKIE_SECURE: env.COOKIE_SECURE,
    COOKIE_DOMAIN: !!env.COOKIE_DOMAIN,
    UPSTASH_REDIS_REST_URL: !!env.UPSTASH_REDIS_REST_URL,
    UPSTASH_REDIS_REST_TOKEN: !!env.UPSTASH_REDIS_REST_TOKEN,
    RESEND_API_KEY: !!env.RESEND_API_KEY,
    RESEND_FROM: !!env.RESEND_FROM,
    SENTRY_DSN: !!env.SENTRY_DSN,
    SENTRY_ENVIRONMENT: !!env.SENTRY_ENVIRONMENT,
    ANTHROPIC_API_KEY: !!env.ANTHROPIC_API_KEY,
  };

  return NextResponse.json(
    {
      status: overall,
      service: "investa-portal",
      version: env.APP_VERSION ?? "dev",
      environment: env.NODE_ENV,
      ts: new Date().toISOString(),
      checks: {
        db: { status: dbStatus, latencyMs: dbLatencyMs },
        rateLimit: { backend: rlBackend },
        sentry: env.SENTRY_DSN ? "configured" : "off",
        email: env.RESEND_API_KEY ? "resend" : "stub",
      },
      env: envFlags,
      lastRuns: {
        ingest: lastIngest
          ? { source: lastIngest.source, at: lastIngest.createdAt.toISOString(), durationMs: lastIngest.durationMs, errors: lastIngest.errors.length }
          : null,
        signals: lastSignals ? { date: lastSignals.date.toISOString().slice(0, 10) } : null,
        report: lastReport ? { date: lastReport.date.toISOString().slice(0, 10), title: lastReport.title } : null,
      },
    },
    {
      status: overall === "ok" ? 200 : 503,
      headers: { "Cache-Control": "no-store" },
    }
  );
}
