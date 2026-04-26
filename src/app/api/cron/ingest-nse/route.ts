import { NextRequest, NextResponse } from "next/server";
import { verifyCronCaller } from "@/backend/api/cron-auth";
import { ingestNse } from "@/backend/jobs/ingest/nse";
import { recordIngest } from "@/backend/jobs/ingest/logger";
import { logger } from "@/backend/utils/logger.util";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  const auth = await verifyCronCaller(req);
  if (!auth.authed) {
    return NextResponse.json(
      { type: "about:blank#unauthorized", title: "Unauthorized", status: 401, detail: auth.reason },
      { status: 401, headers: { "content-type": "application/problem+json" } }
    );
  }
  logger.info({ triggeredBy: auth.triggeredBy }, "cron_nse_start");
  const result = await ingestNse();
  await recordIngest(result, auth.triggeredBy);
  return NextResponse.json(result);
}

export const POST = GET;
