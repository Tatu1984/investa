import { prisma } from "@/backend/database/client";
import type { Signal } from "@prisma/client";

export const signalRepository = {
  async latestDate() {
    const r = await prisma.signalsDaily.findFirst({
      orderBy: { date: "desc" },
      select: { date: true },
    });
    return r?.date ?? null;
  },

  async forDate(date: Date, filter?: { signal?: Signal }) {
    return prisma.signalsDaily.findMany({
      where: { date, ...(filter?.signal ? { signal: filter.signal } : {}) },
      include: { asset: true },
      orderBy: [{ confidence: "desc" }, { probability: "desc" }],
    });
  },

  async currentRegime() {
    return prisma.marketRegime.findFirst({ orderBy: { date: "desc" } });
  },
};
