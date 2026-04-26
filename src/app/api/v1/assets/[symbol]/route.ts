import { withApi, ok } from "@/backend/api/middleware";
import { assetService } from "@/backend/services/asset.service";
import { NotFound } from "@/backend/utils/error-handler.util";

export const runtime = "nodejs";

export const GET = withApi<{ params: Promise<{ symbol: string }> }>(async (_req, ctx, { params }) => {
  const { symbol } = await params;
  const a = await assetService.bySymbol(symbol);
  if (!a) throw NotFound(`Asset ${symbol} not found`);
  return ok({ data: a }, ctx);
});
