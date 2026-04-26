import { withAuth, ok } from "@/backend/api/middleware";
import { prisma } from "@/backend/database/client";

export const runtime = "nodejs";

/**
 * v0: rolling 90-day signal summary — counts and average probability per type.
 * Forward-return ledger lands in Phase D v0 once we persist daily close prices
 * joined with signal dates.
 */
export const GET = withAuth(async (_req, ctx) => {
  const since = new Date(Date.now() - 90 * 86400 * 1000);
  const rows = await prisma.signalsDaily.findMany({
    where: { date: { gte: since } },
    select: { signal: true, probability: true, confidence: true, date: true },
  });
  const by = { BUY: [] as number[], HOLD: [] as number[], AVOID: [] as number[] };
  for (const r of rows) by[r.signal].push(r.probability);

  const summary = {
    windowDays: 90,
    totals: { BUY: by.BUY.length, HOLD: by.HOLD.length, AVOID: by.AVOID.length },
    avgProbability: {
      BUY:   by.BUY.length   ? Math.round(by.BUY.reduce((s, x) => s + x, 0)   / by.BUY.length)   : 0,
      HOLD:  by.HOLD.length  ? Math.round(by.HOLD.reduce((s, x) => s + x, 0)  / by.HOLD.length)  : 0,
      AVOID: by.AVOID.length ? Math.round(by.AVOID.reduce((s, x) => s + x, 0) / by.AVOID.length) : 0,
    },
    uniqueDays: new Set(rows.map((r) => r.date.toISOString().slice(0, 10))).size,
    note: "Forward-return ledger coming in Phase D v0.",
  };
  return ok({ data: summary }, ctx);
});
