import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { backfillMfHistory } from "@/backend/jobs/ingest/mf-backfill";

export const runtime = "nodejs";
export const maxDuration = 800;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "500") || 500;
  const filter = req.nextUrl.searchParams.get("filter") ?? "Direct";
  const result = await backfillMfHistory({ limit, filter });
  return ok(result, ctx);
});
