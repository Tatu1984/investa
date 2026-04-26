import { NextRequest } from "next/server";
import { withApi, ok } from "@/backend/api/middleware";
import { assetService } from "@/backend/services/asset.service";
import type { AssetType, Signal } from "@prisma/client";

export const runtime = "nodejs";

const ASSET_TYPES = new Set<AssetType>(["equity", "mf", "etf", "index", "commodity", "currency"]);

export const GET = withApi(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") ?? "BUY").toUpperCase() as Signal;
  const n = Math.min(50, Math.max(1, Number(sp.get("n") ?? "10") || 10));
  const assetTypes = sp.getAll("assetType").filter((t): t is AssetType => ASSET_TYPES.has(t as AssetType));

  const data = await assetService.topPicks({
    type: ["BUY", "HOLD", "AVOID"].includes(type) ? type : "BUY",
    n,
    assetType: assetTypes.length ? assetTypes : undefined,
  });

  return ok({ data, meta: { total: data.length, type, n } }, ctx);
});
