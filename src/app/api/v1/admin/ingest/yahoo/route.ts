import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { ingestYahoo } from "@/backend/jobs/ingest/yahoo";

export const runtime = "nodejs";
export const maxDuration = 60;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const range = req.nextUrl.searchParams.get("range") ?? "1mo";
  const result = await ingestYahoo({ range });
  return ok(result, ctx);
});
