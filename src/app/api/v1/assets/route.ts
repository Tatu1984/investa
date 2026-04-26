import { NextRequest } from "next/server";
import { withApi, ok } from "@/backend/api/middleware";
import { assetService } from "@/backend/services/asset.service";
import type { AssetType, Signal } from "@prisma/client";

export const runtime = "nodejs";

const ASSET_TYPES = new Set<AssetType>(["equity", "mf", "etf", "index", "commodity", "currency"]);
const SIGNAL_TYPES = new Set<Signal>(["BUY", "HOLD", "AVOID"]);

export const GET = withApi(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const types = sp.getAll("type").filter((t): t is AssetType => ASSET_TYPES.has(t as AssetType));
  const signals = sp.getAll("signal").filter((s): s is Signal => SIGNAL_TYPES.has(s as Signal));
  const limit = Number(sp.get("limit") ?? "0") || undefined;
  const assets = await assetService.list({
    types: types.length ? types : undefined,
    signals: signals.length ? signals : undefined,
    limit,
  });
  return ok({ data: assets, meta: { total: assets.length } }, ctx);
});
