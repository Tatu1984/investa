import { NextRequest, NextResponse } from "next/server";
import { verifyCronCaller } from "@/backend/api/cron-auth";
import { ingestAmfi } from "@/backend/jobs/ingest/amfi";
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
  logger.info({ triggeredBy: auth.triggeredBy }, "cron_amfi_start");
  const result = await ingestAmfi();
  await recordIngest(result, auth.triggeredBy);
  return NextResponse.json(result);
}

// Also accept POST so the existing admin dashboard (which POSTs) keeps working.
export const POST = GET;
