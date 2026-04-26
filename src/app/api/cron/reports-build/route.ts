import { NextRequest, NextResponse } from "next/server";
import { verifyCronCaller } from "@/backend/api/cron-auth";
import { buildAndPersist } from "@/backend/services/report.service";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: NextRequest) {
  const auth = await verifyCronCaller(req);
  if (!auth.authed) {
    return NextResponse.json(
      { type: "about:blank#unauthorized", title: "Unauthorized", status: 401, detail: auth.reason },
      { status: 401, headers: { "content-type": "application/problem+json" } }
    );
  }
  const asOf = new Date();
  asOf.setUTCHours(0, 0, 0, 0);
  logger.info({ triggeredBy: auth.triggeredBy }, "cron_report_start");
  const r = await buildAndPersist(asOf);
  return NextResponse.json(r);
}

export const POST = GET;
