import { NextRequest } from "next/server";
import { withAuth, ok } from "@/backend/api/middleware";
import { assetService } from "@/backend/services/asset.service";
import type { Signal } from "@prisma/client";

export const runtime = "nodejs";

export const GET = withAuth(async (req: NextRequest, ctx) => {
  const type = (req.nextUrl.searchParams.get("type") ?? "").toUpperCase();
  const validType = (["BUY", "HOLD", "AVOID"] as Signal[]).includes(type as Signal);
  const [buys, holds, avoids] = await Promise.all([
    assetService.topPicks({ type: "BUY", n: 50 }),
    assetService.topPicks({ type: "HOLD", n: 50 }),
    assetService.topPicks({ type: "AVOID", n: 50 }),
  ]);
  if (validType) {
    const single = type === "BUY" ? buys : type === "HOLD" ? holds : avoids;
    return ok({ data: single, meta: { type, total: single.length } }, ctx);
  }
  return ok({ data: { buys, holds, avoids }, meta: { total: buys.length + holds.length + avoids.length } }, ctx);
});
