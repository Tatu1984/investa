import "dotenv/config";
import { config as loadEnv } from "dotenv";
import path from "node:path";
import argon2 from "argon2";

loadEnv({ path: path.join(process.cwd(), ".env.local"), override: true });

// Demo reports — 3 narrated briefs so /reports has something to show before
// the Phase E report engine is wired up. Asset / price / NAV data comes from
// the ingestion pipelines (NSE / AMFI / Yahoo), not from here.
const DEMO_REPORTS = [
  {
    date: "2026-04-22",
    title: "Morning Intelligence Brief — 22 April 2026",
    summary:
      "Indian equities opened firm against a mildly risk-on global backdrop. Breadth continues to favor large-caps, with metals and PSU banks leading. Gold maintains its bid as geopolitical hedging persists. Our model regime reads Sideways / Risk-On with 0.62 confidence.",
    sections: {
      marketOverview: "NIFTY 50 +0.34%, Bank Nifty +0.62%, Midcap 100 +0.12%. Advance/decline 1.24. USD/INR stable at 83.24. India VIX at 14.8.",
      keySignals: "6 new BUY calls (led by RELIANCE, HDFCBANK, ITC, PPFCF, GOLDBEES). 2 new AVOID calls (ADANIENT, VEDL). Sideways regime retained.",
      topOpportunities: "Equity: RELIANCE, HDFCBANK, ITC. MF: Parag Parikh Flexi Cap, ICICI Prudential Bluechip. ETF: GOLDBEES for hedge.",
      avoidList: "ADANIENT — high volatility + weak RS. VEDL — trend breakdown below 200D.",
      sectorView: "Relative strength: Metals ▲, PSU Banks ▲, Energy ▲, IT flat, FMCG ▬. Consumer Discretionary weakening.",
      allocation: "Neutral regime → 60% Equity (tilt to large-cap + gold-linked), 25% Debt (short-duration), 15% Gold. Re-balance monthly.",
    },
  },
  {
    date: "2026-04-21",
    title: "Morning Intelligence Brief — 21 April 2026",
    summary: "Sideways regime continues; breadth mildly positive. Gold outperforms on weaker USD.",
    sections: {
      marketOverview: "NIFTY 50 +0.12%, Bank Nifty -0.04%. India VIX at 15.1.",
      keySignals: "4 BUY, 1 AVOID, regime unchanged.",
      topOpportunities: "RELIANCE, PPFCF, GOLDBEES.",
      avoidList: "VEDL.",
      sectorView: "Metals lead, IT lags.",
      allocation: "60/25/15 Equity/Debt/Gold.",
    },
  },
  {
    date: "2026-04-18",
    title: "Morning Intelligence Brief — 18 April 2026",
    summary: "Mild risk-on; options positioning favors banks.",
    sections: {
      marketOverview: "NIFTY 50 +0.44%, Bank Nifty +0.82%.",
      keySignals: "3 BUY, 0 new AVOID.",
      topOpportunities: "HDFCBANK, ICICIBANK.",
      avoidList: "—",
      sectorView: "PSU Banks leading.",
      allocation: "60/25/15.",
    },
  },
];

const DEMO_ALERTS = [
  { id: "alrt_01", symbol: "RELIANCE",  type: "signal_change" as const,  threshold: null,         channel: "email"  as const, active: true },
  { id: "alrt_02", symbol: "ADANIENT",  type: "risk_flag"      as const, threshold: "vol>35%",    channel: "in_app" as const, active: true },
  { id: "alrt_03", symbol: "GOLDBEES",  type: "trend_reversal" as const, threshold: null,         channel: "both"   as const, active: false },
];

async function main() {
  const { prisma } = await import("./client");

  // 1. Demo user
  const passwordHash = await argon2.hash("Demo@123", { type: argon2.argon2id });
  const demo = await prisma.user.upsert({
    where: { email: "demo@investa.local" },
    update: {},
    create: {
      email: "demo@investa.local",
      name: "Demo User",
      passwordHash,
      role: "USER",
      emailVerifiedAt: new Date(),
    },
  });
  console.log(`✓ demo user ${demo.email}`);

  // 2. Market regime (Phase D will compute this; seed a sensible default for today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  await prisma.marketRegime.upsert({
    where: { date: today },
    update: {
      regime: "Sideways", riskState: "RISK_ON", confidence: 0.62,
      rationale: "NIFTY 50 trading within a 3% band for 14 sessions; breadth advance/decline 1.24; India VIX at 14.8 — low-volatility, modestly risk-on tape.",
    },
    create: {
      date: today, regime: "Sideways", riskState: "RISK_ON", confidence: 0.62,
      rationale: "NIFTY 50 trading within a 3% band for 14 sessions; breadth advance/decline 1.24; India VIX at 14.8 — low-volatility, modestly risk-on tape.",
    },
  });
  console.log("✓ market regime seeded");

  // 3. Demo reports
  for (const r of DEMO_REPORTS) {
    const d = new Date(`${r.date}T00:00:00Z`);
    await prisma.report.upsert({
      where: { date: d },
      update: { title: r.title, summary: r.summary, sections: r.sections as unknown as object, status: "published", publishedAt: d },
      create: { date: d, title: r.title, summary: r.summary, sections: r.sections as unknown as object, status: "published", publishedAt: d },
    });
  }
  console.log(`✓ ${DEMO_REPORTS.length} demo reports seeded`);

  // 4. Demo alerts for the demo user
  for (const a of DEMO_ALERTS) {
    await prisma.alert.upsert({
      where: { id: a.id },
      update: { symbol: a.symbol, type: a.type, threshold: a.threshold, channel: a.channel, active: a.active, userId: demo.id },
      create: { id: a.id, userId: demo.id, symbol: a.symbol, type: a.type, threshold: a.threshold, channel: a.channel, active: a.active },
    });
  }
  console.log(`✓ ${DEMO_ALERTS.length} demo alerts seeded`);

  console.log("\nDone. Log in with demo@investa.local / Demo@123");
  console.log("Run the ingestion jobs (POST /api/v1/admin/ingest/{amfi,nse,yahoo}) to populate real market data.");
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(async () => {
    const { prisma } = await import("./client");
    await prisma.$disconnect();
  });
