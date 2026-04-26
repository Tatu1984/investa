import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { Prisma, Signal } from "@prisma/client";

export interface ReportSections {
  marketOverview: string;
  keySignals: string;
  topOpportunities: string;
  avoidList: string;
  sectorView: string;
  allocation: string;
}

export interface BuiltReport {
  date: string;          // YYYY-MM-DD
  title: string;
  summary: string;
  sections: ReportSections;
}

function fmt(n: number | null | undefined, digits = 2, suffix = "") {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits) + suffix;
}

async function topAssetsForDate(date: Date, signal: Signal, limit = 5) {
  return prisma.signalsDaily.findMany({
    where: { date, signal },
    orderBy: [{ confidence: "desc" }, { probability: "desc" }],
    take: limit,
    include: { asset: { select: { symbol: true, name: true, type: true, sector: true } } },
  });
}

/**
 * Build a daily report from whatever real data exists on `asOf`:
 *   - market_regime entry
 *   - signals_daily top BUYs and AVOIDs
 *   - NIFTY 50 features row (ret1d / vol30d / rsi14)
 * No LLM — template-only — so zero external dependency and zero cost.
 * LLM narration is a Phase E+ upgrade.
 */
export async function buildReport(asOf: Date): Promise<BuiltReport> {
  const regime = await prisma.marketRegime.findUnique({ where: { date: asOf } });

  const [buys, holds, avoids] = await Promise.all([
    topAssetsForDate(asOf, "BUY", 5),
    prisma.signalsDaily.count({ where: { date: asOf, signal: "HOLD" } }),
    topAssetsForDate(asOf, "AVOID", 3),
  ]);
  const buyCount = await prisma.signalsDaily.count({ where: { date: asOf, signal: "BUY" } });
  const avoidCount = await prisma.signalsDaily.count({ where: { date: asOf, signal: "AVOID" } });

  // Headline index features (NIFTY 50) for the overview line.
  const nifty = await prisma.asset.findUnique({ where: { symbol: "NIFTY50" } });
  const niftyF = nifty
    ? await prisma.featuresDaily.findUnique({ where: { assetId_date: { assetId: nifty.id, date: asOf } } })
    : null;

  const dateStr = asOf.toISOString().slice(0, 10);
  const humanDate = asOf.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });
  const title = `Morning Intelligence Brief — ${humanDate}`;

  const regimeLine = regime
    ? `Our model reads ${regime.regime} · ${regime.riskState === "RISK_ON" ? "Risk-On" : "Risk-Off"} (confidence ${Number(regime.confidence).toFixed(2)}).`
    : "No regime recorded for this date yet.";

  const niftyLine = niftyF
    ? `NIFTY 50: 1D ${fmt(niftyF.ret1d ? Number(niftyF.ret1d) : null, 2, "%")}, 1M ${fmt(niftyF.ret1m ? Number(niftyF.ret1m) : null, 2, "%")}, vol-30d ${fmt(niftyF.vol30d ? Number(niftyF.vol30d) : null, 1, "%")}, RSI-14 ${fmt(niftyF.rsi14 ? Number(niftyF.rsi14) : null, 0)}.`
    : "NIFTY 50 features not computed yet.";

  const buyLine =
    buys.length > 0
      ? buys.map((b) => `${b.asset.symbol} (${b.probability}%)`).join(", ")
      : "no BUY signals";
  const avoidLine =
    avoids.length > 0
      ? avoids.map((a) => `${a.asset.symbol} (${a.probability}% · ${a.rationale.split(".")[0]})`).join("; ")
      : "no AVOID signals today";

  const sections: ReportSections = {
    marketOverview: [niftyLine, regimeLine, regime?.rationale ?? ""].filter(Boolean).join(" "),
    keySignals: `${buyCount} BUYs, ${holds} HOLDs, ${avoidCount} AVOIDs. Top picks: ${buyLine}.`,
    topOpportunities:
      buys.length > 0
        ? buys.map((b) => `• ${b.asset.symbol} — ${b.asset.name} (${b.asset.sector ?? "—"}) · ${b.rationale}`).join("\n")
        : "No BUY-classified assets today — more data needed as the ingestion history deepens.",
    avoidList:
      avoids.length > 0
        ? avoids.map((a) => `• ${a.asset.symbol} — ${a.rationale}`).join("\n")
        : "No AVOID signals flagged today.",
    sectorView: await sectorViewLine(asOf),
    allocation: regime
      ? allocationFromRegime(regime.regime, regime.riskState)
      : "No allocation suggested without a regime reading — seed the regime or wait for the nightly run.",
  };

  const summary =
    `Today's regime reads ${regime?.regime ?? "—"} / ${regime?.riskState === "RISK_ON" ? "Risk-On" : regime ? "Risk-Off" : "—"}. ` +
    `${buyCount} new BUYs, ${avoidCount} new AVOIDs. ${niftyLine} ` +
    `${buys[0] ? `Top pick: ${buys[0].asset.symbol} at ${buys[0].probability}% probability.` : ""}`;

  return { date: dateStr, title, summary, sections };
}

function allocationFromRegime(regime: string, risk: string): string {
  if (regime === "Bull" && risk === "RISK_ON") return "Tilt growth: 75% Equity / 15% Debt / 10% Gold. Favor cyclicals and large-caps.";
  if (regime === "Bear")                          return "Defensive: 40% Equity (quality large-cap only) / 45% Debt (short-duration) / 15% Gold.";
  if (risk === "RISK_OFF")                        return "Cautious: 55% Equity / 30% Debt / 15% Gold. Rebalance monthly.";
  return "Neutral: 60% Equity / 25% Debt / 15% Gold. Re-balance monthly.";
}

async function sectorViewLine(asOf: Date): Promise<string> {
  // Cross-sectional average 1D return by sector (from features_daily joined via Asset).
  const rows = await prisma.$queryRaw<{ sector: string; avg_ret: number; n: number }[]>`
    SELECT a.sector, AVG(f.ret1d)::float AS avg_ret, COUNT(*)::int AS n
    FROM features_daily f
    JOIN assets a ON a.id = f."assetId"
    WHERE f.date = ${asOf} AND a.sector IS NOT NULL AND a.type = 'equity' AND f.ret1d IS NOT NULL
    GROUP BY a.sector
    HAVING COUNT(*) >= 2
    ORDER BY avg_ret DESC
    LIMIT 5
  `;
  if (rows.length === 0) return "Not enough sector breadth yet — richer sector view once multi-day NSE ingestion accrues.";
  const leaders = rows.slice(0, 2).map((r) => `${r.sector} ${(r.avg_ret * 100).toFixed(2)}%`).join(", ");
  const laggards = rows.slice(-2).map((r) => `${r.sector} ${(r.avg_ret * 100).toFixed(2)}%`).join(", ");
  return `Leading: ${leaders}. Lagging: ${laggards}.`;
}

/** Build and upsert into the Report table. */
export async function buildAndPersist(asOf: Date) {
  const r = await buildReport(asOf);
  const dateOnly = new Date(`${r.date}T00:00:00Z`);
  await prisma.report.upsert({
    where: { date: dateOnly },
    update: {
      title: r.title,
      summary: r.summary,
      sections: r.sections as unknown as Prisma.InputJsonValue,
      status: "published",
      publishedAt: new Date(),
    },
    create: {
      date: dateOnly,
      title: r.title,
      summary: r.summary,
      sections: r.sections as unknown as Prisma.InputJsonValue,
      status: "published",
      publishedAt: new Date(),
    },
  });
  logger.info({ date: r.date, title: r.title }, "report_built");
  return r;
}
