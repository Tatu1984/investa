import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { backfillNseFromYahoo } from "@/backend/jobs/ingest/yahoo-backfill";

export const runtime = "nodejs";
// Long-running — only callable from a Node script or local dev. Vercel hobby/pro
// caps at 300s/800s; 2,700 symbols × ~200ms each can run ~10-15 min, so we run
// this from a local tunnel or a worker, not via the deployed function.
export const maxDuration = 800;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const range = req.nextUrl.searchParams.get("range") ?? "1y";
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "0") || undefined;
  const result = await backfillNseFromYahoo({ range, limit });
  return ok(result, ctx);
});
