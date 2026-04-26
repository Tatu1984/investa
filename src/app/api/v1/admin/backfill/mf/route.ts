import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { backfillMfHistory } from "@/backend/jobs/ingest/mf-backfill";

export const runtime = "nodejs";
// Resumable. See yahoo backfill route for the rationale.
export const maxDuration = 60;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const limit = Number(sp.get("limit") ?? "300") || 300;
  const filter = sp.get("filter") ?? "Direct";
  const cursor = sp.get("cursor") || undefined;
  const result = await backfillMfHistory({ limit, filter, cursor, budgetMs: 50_000 });
  return ok(result, ctx);
});
