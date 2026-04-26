import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { runAnalytics } from "@/backend/jobs/analytics/run";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — large asset universe

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const dateStr = req.nextUrl.searchParams.get("date");
  const asOf = dateStr ? new Date(`${dateStr}T00:00:00Z`) : undefined;
  const result = await runAnalytics({ asOf });
  return ok(result, ctx);
});
