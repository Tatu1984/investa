import { withAdmin, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";

export const GET = withAdmin(async (_req, ctx) => {
  let db: "ok" | "down" = "down";
  let dbLatencyMs: number | null = null;
  try {
    const started = Date.now();
    await prisma.$queryRaw`SELECT 1`;
    dbLatencyMs = Date.now() - started;
    db = "ok";
  } catch (e) {
    logger.warn({ err: e }, "db_healthcheck_failed");
  }
  return ok(
    {
      status: db === "ok" ? "ok" : "degraded",
      service: "investa-portal",
      checks: { db, dbLatencyMs },
      ts: new Date().toISOString(),
    },
    ctx
  );
});
