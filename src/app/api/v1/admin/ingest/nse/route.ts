import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { ingestNse } from "@/backend/jobs/ingest/nse";

export const runtime = "nodejs";
export const maxDuration = 300;

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "0") || undefined;
  const result = await ingestNse({ limit });
  return ok(result, ctx);
});
