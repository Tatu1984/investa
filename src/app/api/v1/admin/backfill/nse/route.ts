import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { backfillNseFromYahoo } from "@/backend/jobs/ingest/yahoo-backfill";

export const runtime = "nodejs";
// Vercel Hobby caps at 60s for serverless functions; the job is resumable so
// the BootstrapPanel calls this in a loop using `nextCursor` until `done: true`.
export const maxDuration = 60;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const range = sp.get("range") ?? "1y";
  const limit = Number(sp.get("limit") ?? "0") || undefined;
  const cursor = sp.get("cursor") || undefined;
  const result = await backfillNseFromYahoo({ range, limit, cursor, budgetMs: 50_000 });
  return ok(result, ctx);
});
