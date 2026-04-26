import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { buildAndPersist } from "@/backend/services/report.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const dateStr = req.nextUrl.searchParams.get("date");
  const asOf = dateStr
    ? new Date(`${dateStr}T00:00:00Z`)
    : (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
  const r = await buildAndPersist(asOf);
  return ok({ data: r, meta: { asOf: r.date } }, ctx);
});
