import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import { sendEmail } from "@/backend/utils/email.util";
import type { Alert, AlertType, Prisma, Signal } from "@prisma/client";

export interface EvaluatorResult {
  asOf: string;
  alertsScanned: number;
  alertsActive: number;
  eventsFired: number;
  emailsAttempted: number;
  byType: Record<AlertType, number>;
  durationMs: number;
  errors: string[];
}

interface FireContext {
  alert: Alert & { user: { email: string; id: string } };
  asOf: Date;
  reason: string;            // short human-readable
  payload: Prisma.InputJsonValue;
}

/** Pull a numeric threshold out of a free-text field like "vol>35%" or "35" or " 35.5  ". Returns null if not parseable. */
function parseNumericThreshold(t: string | null | undefined): number | null {
  if (!t) return null;
  const m = t.match(/-?\d+(\.\d+)?/);
  return m ? Number(m[0]) : null;
}

async function findAssetBySymbol(symbol: string) {
  return prisma.asset.findFirst({ where: { symbol: { equals: symbol, mode: "insensitive" } } });
}

async function latestTwoSignalDatesFor(assetId: string): Promise<{ today: Date | null; yesterday: Date | null }> {
  const rows = await prisma.signalsDaily.findMany({
    where: { assetId },
    orderBy: { date: "desc" },
    take: 2,
    select: { date: true },
  });
  return { today: rows[0]?.date ?? null, yesterday: rows[1]?.date ?? null };
}

async function evaluateOne(alert: FireContext["alert"], asOf: Date): Promise<FireContext | null> {
  const asset = await findAssetBySymbol(alert.symbol);
  if (!asset) return null;

  if (alert.type === "signal_change") {
    const dates = await latestTwoSignalDatesFor(asset.id);
    if (!dates.today || !dates.yesterday) return null;
    const [today, yest] = await Promise.all([
      prisma.signalsDaily.findUnique({ where: { assetId_date: { assetId: asset.id, date: dates.today } } }),
      prisma.signalsDaily.findUnique({ where: { assetId_date: { assetId: asset.id, date: dates.yesterday } } }),
    ]);
    if (!today || !yest) return null;
    if (today.signal === yest.signal) return null;
    return {
      alert,
      asOf,
      reason: `Signal changed: ${yest.signal} → ${today.signal}`,
      payload: {
        type: "signal_change",
        previous: { signal: yest.signal, probability: yest.probability, date: yest.date.toISOString().slice(0, 10) },
        current: { signal: today.signal, probability: today.probability, confidence: Number(today.confidence), rationale: today.rationale, date: today.date.toISOString().slice(0, 10) },
      },
    };
  }

  if (alert.type === "risk_flag") {
    // Use the asset's latest features row.
    const f = await prisma.featuresDaily.findFirst({
      where: { assetId: asset.id },
      orderBy: { date: "desc" },
    });
    if (!f || f.vol30d == null) return null;
    const threshold = parseNumericThreshold(alert.threshold) ?? 35;  // default 35% annualized vol
    const vol = Number(f.vol30d);
    if (vol <= threshold) return null;
    return {
      alert,
      asOf,
      reason: `Volatility ${vol.toFixed(1)}% above threshold ${threshold}%`,
      payload: {
        type: "risk_flag",
        threshold,
        vol30d: vol,
        date: f.date.toISOString().slice(0, 10),
      },
    };
  }

  if (alert.type === "trend_reversal") {
    // Need today's + a recent prior features row to detect the cross.
    const rows = await prisma.featuresDaily.findMany({
      where: { assetId: asset.id, ma50: { not: null }, ma200: { not: null } },
      orderBy: { date: "desc" },
      take: 2,
    });
    if (rows.length < 2) return null;
    const [today, yest] = rows;
    const todayUp = Number(today!.ma50) > Number(today!.ma200);
    const yestUp = Number(yest!.ma50) > Number(yest!.ma200);
    if (todayUp === yestUp) return null;
    const direction = todayUp ? "Golden cross (50DMA up through 200DMA)" : "Death cross (50DMA down through 200DMA)";
    return {
      alert,
      asOf,
      reason: direction,
      payload: {
        type: "trend_reversal",
        direction: todayUp ? "golden" : "death",
        today: { date: today!.date.toISOString().slice(0, 10), ma50: Number(today!.ma50), ma200: Number(today!.ma200) },
        previous: { date: yest!.date.toISOString().slice(0, 10), ma50: Number(yest!.ma50), ma200: Number(yest!.ma200) },
      },
    };
  }

  return null;
}

function emailHtmlFor(ctx: FireContext): string {
  return `
    <div style="font-family: Inter, -apple-system, Arial, sans-serif; color:#1a1f2c; max-width:560px; margin:0 auto;">
      <div style="font-size:10px; color:#7a7f8c; text-transform:uppercase; letter-spacing:1px;">Investa · alert</div>
      <h1 style="font-size:18px; margin:6px 0 12px;">${ctx.alert.symbol} — ${ctx.reason}</h1>
      <p style="line-height:1.55;">Your <strong>${ctx.alert.type.replace("_", " ")}</strong> alert on <strong>${ctx.alert.symbol}</strong> fired today.</p>
      <pre style="font-family:ui-monospace,Monaco,monospace; font-size:11px; background:#f6f6f6; padding:12px; border-radius:6px; overflow:auto;">${escapeHtml(JSON.stringify(ctx.payload, null, 2))}</pre>
      <p style="font-size:11px; color:#8a8f99; line-height:1.55; border-top:1px solid #eaeaea; padding-top:12px; margin-top:24px;">
        Manage your alerts at <a href="${process.env.APP_URL ?? "http://localhost:3000"}/alerts">/alerts</a>.
        Research-only. Not investment advice.
      </p>
    </div>`;
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

/**
 * Run the evaluator for all active alerts.
 * Idempotent within a day: if the alert already has an event today with the same `type`, skip.
 */
export async function runAlertEvaluator(opts: { asOf?: Date } = {}): Promise<EvaluatorResult> {
  const started = Date.now();
  const asOf = opts.asOf ?? (() => { const d = new Date(); d.setUTCHours(0, 0, 0, 0); return d; })();
  const dayStart = new Date(asOf);
  dayStart.setUTCHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);

  const alerts = await prisma.alert.findMany({
    where: { active: true },
    include: { user: { select: { id: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });

  const errors: string[] = [];
  const byType: Record<AlertType, number> = { signal_change: 0, risk_flag: 0, trend_reversal: 0 };
  let fired = 0;
  let emails = 0;

  for (const alert of alerts) {
    try {
      // Idempotency: already fired today? skip.
      const existing = await prisma.alertEvent.findFirst({
        where: { alertId: alert.id, triggeredAt: { gte: dayStart, lt: dayEnd } },
        select: { id: true },
      });
      if (existing) continue;

      const ctx = await evaluateOne(alert, asOf);
      if (!ctx) continue;

      await prisma.alertEvent.create({
        data: { alertId: alert.id, triggeredAt: new Date(), payload: ctx.payload },
      });
      fired++;
      byType[alert.type]++;

      if (alert.channel === "email" || alert.channel === "both") {
        emails++;
        await sendEmail({
          to: alert.user.email,
          subject: `Investa alert · ${alert.symbol} — ${ctx.reason}`,
          html: emailHtmlFor(ctx),
          text: `${alert.symbol}: ${ctx.reason}\n\n${JSON.stringify(ctx.payload, null, 2)}`,
        }).catch((e) => {
          errors.push(`email ${alert.id} → ${alert.user.email}: ${e instanceof Error ? e.message : String(e)}`);
        });
      }
    } catch (e) {
      errors.push(`alert ${alert.id} (${alert.symbol} / ${alert.type}): ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  const result: EvaluatorResult = {
    asOf: asOf.toISOString(),
    alertsScanned: alerts.length,
    alertsActive: alerts.length,
    eventsFired: fired,
    emailsAttempted: emails,
    byType,
    durationMs: Date.now() - started,
    errors,
  };
  logger.info(result, "alerts_evaluator_done");
  return result;
}
