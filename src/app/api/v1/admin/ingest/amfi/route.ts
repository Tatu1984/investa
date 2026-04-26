import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { ingestAmfi } from "@/backend/jobs/ingest/amfi";

export const runtime = "nodejs";
export const maxDuration = 300; // 5 min — AMFI parse is heavy

export const POST = withAdmin(async (req: NextRequest, ctx) => {
  const limit = Number(req.nextUrl.searchParams.get("limit") ?? "0") || undefined;
  const result = await ingestAmfi({ limit });
  return ok(result, ctx);
});
