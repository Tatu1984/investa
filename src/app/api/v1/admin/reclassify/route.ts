import { NextRequest } from "next/server";
import { withAdmin, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";
import { classifyEquity, classifyMf, classifyEtfBySymbol } from "@/backend/services/classifier.service";

export const runtime = "nodejs";
export const maxDuration = 300;

/**
 * Re-classify every Asset row using the current classifier rules. Idempotent —
 * called automatically from the Bootstrap page after first ingest, and any time
 * the classifier rules are updated.
 */
export const POST = withAdmin(async (_req: NextRequest, ctx) => {
  const assets = await prisma.asset.findMany({
    select: { id: true, symbol: true, name: true, type: true, sector: true, subType: true },
  });

  const updates: { id: string; subType: string | null }[] = [];
  for (const a of assets) {
    let next: string | null = null;
    if (a.type === "equity") next = classifyEquity(a.symbol);
    else if (a.type === "mf") next = classifyMf(a.name, a.sector ?? "");
    else if (a.type === "etf" || a.type === "commodity") next = classifyEtfBySymbol(a.symbol);
    if (next !== a.subType) updates.push({ id: a.id, subType: next });
  }

  // Batch updates (chunked to keep Neon happy).
  const CHUNK = 100;
  let updated = 0;
  for (let i = 0; i < updates.length; i += CHUNK) {
    const slice = updates.slice(i, i + CHUNK);
    await Promise.all(
      slice.map((u) =>
        prisma.asset.update({ where: { id: u.id }, data: { subType: u.subType } })
      )
    );
    updated += slice.length;
  }

  // Bucket counts so the caller can verify the result at a glance.
  const counts = await prisma.asset.groupBy({
    by: ["type", "subType"],
    _count: { _all: true },
  });

  return ok(
    {
      total: assets.length,
      updated,
      buckets: counts.map((c) => ({ type: c.type, subType: c.subType, count: c._count._all })),
    },
    ctx
  );
});
