import { NextRequest } from "next/server";
import { withApi, ok } from "@/backend/api/middleware";
import { assetService, type Horizon, type RiskProfile } from "@/backend/services/asset.service";
import type { AssetType, Signal } from "@prisma/client";

export const runtime = "nodejs";

const ASSET_TYPES = new Set<AssetType>(["equity", "mf", "etf", "index", "commodity", "currency"]);
const RISK_VALUES = new Set<RiskProfile>(["careful", "balanced", "growth"]);
const HORIZON_VALUES = new Set<Horizon>(["short", "medium", "long"]);

export const GET = withApi(async (req: NextRequest, ctx) => {
  const sp = req.nextUrl.searchParams;
  const type = (sp.get("type") ?? "BUY").toUpperCase() as Signal;
  const n = Math.min(50, Math.max(1, Number(sp.get("n") ?? "10") || 10));
  const assetTypes = sp.getAll("assetType").filter((t): t is AssetType => ASSET_TYPES.has(t as AssetType));

  // New: subType, risk, horizon — wired by /for-you to personalise the picks.
  const subTypes = sp.getAll("subType").filter((s) => s.length > 0);
  const riskRaw = sp.get("risk");
  const horizonRaw = sp.get("horizon");
  const risk = riskRaw && RISK_VALUES.has(riskRaw as RiskProfile) ? (riskRaw as RiskProfile) : undefined;
  const horizon = horizonRaw && HORIZON_VALUES.has(horizonRaw as Horizon) ? (horizonRaw as Horizon) : undefined;

  const data = await assetService.topPicks({
    type: ["BUY", "HOLD", "AVOID"].includes(type) ? type : "BUY",
    n,
    assetType: assetTypes.length ? assetTypes : undefined,
    subType: subTypes.length ? subTypes : undefined,
    risk,
    horizon,
  });

  return ok({ data, meta: { total: data.length, type, n, risk, horizon, subTypes } }, ctx);
});
