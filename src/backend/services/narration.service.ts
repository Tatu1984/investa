import { env } from "@/config/env";
import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { Regime, RiskState, Signal } from "@prisma/client";

/**
 * Claude-backed narration for a signal.
 *
 * Architecture: The rule engine (rules-v0.1) classifies — Claude only narrates
 * the "why" in plain English. We never let the LLM decide BUY/HOLD/AVOID;
 * that minimizes hallucination risk on numbers and keeps inference cost bounded.
 *
 * Design notes:
 *  - Prompt-cached system + regime block (changes once per day) keeps the
 *    incremental per-pick cost under ~$0.001.
 *  - Hard daily spend cap via env.LLM_DAILY_BUDGET_USD; once breached,
 *    every subsequent call short-circuits and returns null (caller keeps
 *    the keyword-based rationale).
 *  - Strictly numerical inputs — we do NOT pass news, fundamentals, P/E etc.
 *    so Claude can't make any of those up.
 *
 * Pricing assumptions (Sonnet 4.6, Apr 2026):
 *    input  uncached:  $3.00 / Mtok
 *    input  cached:    $0.30 / Mtok      (5-min ephemeral cache)
 *    output:          $15.00 / Mtok
 */

const MODEL = "claude-sonnet-4-6";
const MAX_OUTPUT_TOKENS = 220;
const SYSTEM_PROMPT = `You are a financial-data narrator for a research-only investment dashboard.
You receive a signal classification (already decided by a rule engine) plus a set of measured numerical features for one asset.
Your only job is to explain — in 2 to 3 plain-English sentences — why the rule fired, using ONLY the numerical evidence I provide.
Keep the tone calm, factual, conversational. Aim for a smart retail investor, not a quant.

Hard rules:
- Do NOT invent fundamentals: no P/E ratios, no sector outlook, no news, no management commentary, no earnings.
- Do NOT speculate on future direction beyond what the features support.
- Do NOT recommend; do NOT use first-person "I" or "we".
- Do NOT add headers, bullets, or markdown. Plain prose only.
- Always reference at least two of the numerical factors I provide.
- For an AVOID, explain the warning factors. For a BUY, explain the supporting factors. For a HOLD, acknowledge the mixed picture.
`;

interface SignalForNarration {
  symbol: string;
  name: string;
  type: string;          // equity | mf | etf | index | currency | commodity
  sector: string | null;
  signal: Signal;
  probability: number;
  confidence: number;
  features: {
    lastClose: number;
    ret1m: number | null;
    vol30d: number | null;
    maxDrawdown: number | null;
    rsi14: number | null;
    ma50: number | null;
    ma200: number | null;
    dataPoints: number;
  };
  /** Plain-language rationale string the rule engine produced — given as a hint to Claude. */
  ruleRationale: string;
}

interface RegimeContext {
  regime: Regime;
  riskState: RiskState;
  confidence: number;
  rationale: string;
  date: Date;
}

interface NarrationResult {
  text: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
}

function pricePerMtok(kind: "input" | "cached" | "output") {
  // Approx Anthropic Sonnet pricing as of v4.6 (subject to change). Defensive defaults.
  return { input: 3.0, cached: 0.30, output: 15.0 }[kind];
}

function tokensCost(tokens: number, kind: "input" | "cached" | "output") {
  return (tokens / 1_000_000) * pricePerMtok(kind);
}

/**
 * Returns today's accumulated narration cost (USD) by reading SentEmail-like audit.
 * We persist a marker row in `audit_log` per call.
 */
async function getTodaysSpend(): Promise<number> {
  const since = new Date();
  since.setUTCHours(0, 0, 0, 0);
  const rows = await prisma.auditLog.findMany({
    where: { action: "llm_narrate", ts: { gte: since } },
    select: { meta: true },
  });
  return rows.reduce((sum, r) => {
    const cost = (r.meta as { cost?: number } | null)?.cost ?? 0;
    return sum + (Number.isFinite(cost) ? cost : 0);
  }, 0);
}

async function recordSpend(symbol: string, result: NarrationResult) {
  try {
    await prisma.auditLog.create({
      data: {
        action: "llm_narrate",
        entity: "signal",
        entityId: symbol,
        meta: {
          model: MODEL,
          cost: result.costUsd,
          inputTokens: result.inputTokens,
          cachedInputTokens: result.cachedInputTokens,
          outputTokens: result.outputTokens,
        },
      },
    });
  } catch {
    // Best-effort — don't fail narration if audit_log write hiccups
  }
}

function buildUserPrompt(s: SignalForNarration): string {
  const f = s.features;
  const ma50 = f.ma50 != null ? f.ma50.toFixed(2) : "—";
  const ma200 = f.ma200 != null ? f.ma200.toFixed(2) : "—";
  const aboveMa50 = f.ma50 != null ? (f.lastClose > f.ma50 ? "above" : "below") : "n/a";
  const aboveMa200 = f.ma200 != null ? (f.lastClose > f.ma200 ? "above" : "below") : "n/a";
  const goldenCross = f.ma50 != null && f.ma200 != null ? (f.ma50 > f.ma200 ? "yes (50DMA above 200DMA)" : "no (50DMA below 200DMA)") : "n/a";
  return [
    `Asset: ${s.symbol} — ${s.name}`,
    `Type: ${s.type}${s.sector ? ` · ${s.sector}` : ""}`,
    `Latest close: ${s.features.lastClose}`,
    ``,
    `Rule-engine decision: ${s.signal} · probability ${s.probability}% · confidence ${s.confidence.toFixed(2)}`,
    ``,
    `Measured features:`,
    `  - 1-month return: ${f.ret1m != null ? f.ret1m.toFixed(2) + "%" : "—"}`,
    `  - 30-day annualised volatility: ${f.vol30d != null ? f.vol30d.toFixed(1) + "%" : "—"}`,
    `  - Max drawdown over period: ${f.maxDrawdown != null ? f.maxDrawdown.toFixed(1) + "%" : "—"}`,
    `  - RSI (14): ${f.rsi14 != null ? f.rsi14.toFixed(0) : "—"}`,
    `  - 50-day moving average: ${ma50} (price is ${aboveMa50})`,
    `  - 200-day moving average: ${ma200} (price is ${aboveMa200})`,
    `  - Trend cross: ${goldenCross}`,
    `  - Data points used: ${f.dataPoints}`,
    ``,
    `Internal rule rationale (for your reference; rephrase, don't quote):`,
    `  ${s.ruleRationale}`,
    ``,
    `Write the 2-3 sentence narration now.`,
  ].join("\n");
}

let _client: import("@anthropic-ai/sdk").default | null = null;
function getClient() {
  if (!_client && env.ANTHROPIC_API_KEY) {
    // Lazy import keeps the SDK out of the bundle when key is unset.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require("@anthropic-ai/sdk").default;
    _client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) as import("@anthropic-ai/sdk").default;
  }
  return _client;
}

export interface NarrateBatchResult {
  attempted: number;
  narrated: number;
  costUsd: number;
  skippedNoKey: boolean;
  skippedBudget: boolean;
  errors: string[];
}

/**
 * Narrate a batch of signals. Caller decides which signals are worth narrating
 * (typically: top BUYs + top AVOIDs). Persists rationale back to signals_daily.
 *
 * Returns aggregate stats — never throws on a per-signal failure.
 */
export async function narrateAndPersist(
  signals: SignalForNarration[],
  regime: RegimeContext | null,
  date: Date
): Promise<NarrateBatchResult> {
  const result: NarrateBatchResult = {
    attempted: 0,
    narrated: 0,
    costUsd: 0,
    skippedNoKey: false,
    skippedBudget: false,
    errors: [],
  };

  if (!env.ANTHROPIC_API_KEY) {
    result.skippedNoKey = true;
    logger.info({ count: signals.length }, "narration_skipped_no_key");
    return result;
  }

  const todaysSpend = await getTodaysSpend();
  if (todaysSpend >= env.LLM_DAILY_BUDGET_USD) {
    result.skippedBudget = true;
    logger.warn({ todaysSpend, budget: env.LLM_DAILY_BUDGET_USD }, "narration_skipped_budget_exceeded");
    return result;
  }

  const client = getClient();
  if (!client) {
    result.skippedNoKey = true;
    return result;
  }

  // Cached system + regime block. The asset-specific prompt is uncached.
  const regimeBlock = regime
    ? `Today's market regime: ${regime.regime} · ${regime.riskState === "RISK_ON" ? "Risk-On" : "Risk-Off"} (model confidence ${regime.confidence.toFixed(2)}). Context: ${regime.rationale}`
    : `Today's market regime: not available.`;

  let runningSpend = todaysSpend;
  let symbolsToWrite: { symbol: string; date: Date; rationale: string }[] = [];

  for (const s of signals) {
    if (runningSpend >= env.LLM_DAILY_BUDGET_USD) {
      result.skippedBudget = true;
      break;
    }
    result.attempted++;

    try {
      const userPrompt = buildUserPrompt(s);
      const resp = await client.messages.create({
        model: MODEL,
        max_tokens: MAX_OUTPUT_TOKENS,
        // System prompt is cached so subsequent calls within 5 min reuse it.
        system: [
          { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
          { type: "text", text: regimeBlock,    cache_control: { type: "ephemeral" } },
        ],
        messages: [{ role: "user", content: userPrompt }],
      });

      const text = resp.content
        .filter((b) => b.type === "text")
        .map((b) => (b as { text: string }).text)
        .join(" ")
        .trim()
        .replace(/\s+/g, " ");

      const usage = (resp.usage ?? {}) as {
        input_tokens?: number;
        cache_creation_input_tokens?: number;
        cache_read_input_tokens?: number;
        output_tokens?: number;
      };
      const inputTokens = usage.input_tokens ?? 0;
      const cachedInputTokens = (usage.cache_read_input_tokens ?? 0);
      const cacheCreationTokens = (usage.cache_creation_input_tokens ?? 0);
      const outputTokens = usage.output_tokens ?? 0;

      // Cost: cache writes are billed at input price; cache reads at cached rate.
      const costUsd =
        tokensCost(inputTokens, "input") +
        tokensCost(cacheCreationTokens, "input") +
        tokensCost(cachedInputTokens, "cached") +
        tokensCost(outputTokens, "output");

      runningSpend += costUsd;
      result.costUsd += costUsd;
      result.narrated++;

      const detail: NarrationResult = {
        text,
        inputTokens: inputTokens + cacheCreationTokens,
        cachedInputTokens,
        outputTokens,
        costUsd,
      };
      await recordSpend(s.symbol, detail);

      symbolsToWrite.push({ symbol: s.symbol, date, rationale: text });
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      logger.warn({ symbol: s.symbol, err: msg }, "narration_failed");
      if (result.errors.length < 20) result.errors.push(`${s.symbol}: ${msg}`);
    }
  }

  // Persist back to signals_daily — single batch.
  if (symbolsToWrite.length > 0) {
    const assetsBySymbol = await prisma.asset.findMany({
      where: { symbol: { in: symbolsToWrite.map((x) => x.symbol) } },
      select: { id: true, symbol: true },
    });
    const idBySymbol = new Map(assetsBySymbol.map((a) => [a.symbol, a.id]));
    await Promise.all(
      symbolsToWrite.map((row) => {
        const assetId = idBySymbol.get(row.symbol);
        if (!assetId) return Promise.resolve();
        return prisma.signalsDaily.update({
          where: { assetId_date: { assetId, date: row.date } },
          data: { rationale: row.rationale },
        }).catch(() => {});
      })
    );
  }

  logger.info(
    { attempted: result.attempted, narrated: result.narrated, costUsd: result.costUsd.toFixed(4), skippedNoKey: result.skippedNoKey, skippedBudget: result.skippedBudget },
    "narration_batch_done"
  );
  return result;
}
