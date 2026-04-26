import { prisma } from "@/backend/database/client";
import type { AssetType, Signal } from "@prisma/client";

export const assetRepository = {
  /**
   * List assets with their latest signal (if any). Optional filters by type.
   * Returns a lean shape suitable for an API DTO.
   */
  async listWithLatestSignal(opts: { types?: AssetType[]; signals?: Signal[]; limit?: number } = {}) {
    const rows = await prisma.asset.findMany({
      where: opts.types?.length ? { type: { in: opts.types } } : undefined,
      include: {
        signals: { orderBy: { date: "desc" }, take: 1 },
        prices:  { orderBy: { ts: "desc" }, take: 2 },
        navs:    { orderBy: { ts: "desc" }, take: 2 },
      },
      take: opts.limit,
      orderBy: { symbol: "asc" },
    });
    if (!opts.signals?.length) return rows;
    return rows.filter((r) => r.signals[0] && opts.signals!.includes(r.signals[0].signal));
  },

  async findBySymbolWithLatestSignal(symbol: string) {
    return prisma.asset.findFirst({
      where: { symbol: { equals: symbol, mode: "insensitive" } },
      include: {
        signals: { orderBy: { date: "desc" }, take: 1 },
        prices:  { orderBy: { ts: "desc" }, take: 2 },
        navs:    { orderBy: { ts: "desc" }, take: 2 },
      },
    });
  },

  async findBySymbols(symbols: string[]) {
    return prisma.asset.findMany({
      where: { symbol: { in: symbols } },
      include: {
        signals: { orderBy: { date: "desc" }, take: 1 },
        prices:  { orderBy: { ts: "desc" }, take: 2 },
        navs:    { orderBy: { ts: "desc" }, take: 2 },
      },
    });
  },
};
