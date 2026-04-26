import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { runAlertEvaluator } from "@/backend/jobs/alerts/evaluator";

export const runtime = "nodejs";
export const maxDuration = 120;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const dateStr = req.nextUrl.searchParams.get("date");
  const asOf = dateStr
    ? new Date(`${dateStr}T00:00:00Z`)
    : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
  const result = await runAlertEvaluator({ asOf });
  return ok(result, ctx);
});
