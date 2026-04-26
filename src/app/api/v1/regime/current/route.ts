import { withApi, ok } from "@/backend/api/middleware";
import { assetService } from "@/backend/services/asset.service";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = withApi(async (_req, ctx) => {
  const r = await assetService.regime();
  if (!r) throw NotFound("No market regime recorded yet");
  return ok({ data: r }, ctx);
});
