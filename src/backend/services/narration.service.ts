import { env } from "@/config/env";
import { prisma } from "@/backend/database/client";
import { logger } from "@/backend/utils/logger.util";
import type { Regime, RiskState, Signal } from "@prisma/client";

/**
 * Multi-provider narration. The rule engine classifies; the LLM only narrates the
 * "why" in plain English. We never let the LLM decide BUY/HOLD/AVOID.
 *
 * Provider priority (first one with a key wins; later ones used as fallback):
 *   1. Gemini     (free tier — Google AI Studio, no card)
 *   2. Groq       (free tier — Llama 3.3 70B, very fast)
 *   3. OpenRouter (free models — DeepSeek R1, Llama, Gemini Flash)
 *   4. Anthropic  (paid — Claude Sonnet, kept as a premium fallback)
 *
 * All providers share the same prompts and persistence. Free providers report
 * costUsd = 0 and are exempt from the daily budget cap.
 */

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
  /** Plain-language rationale string the rule engine produced — given as a hint to the LLM. */
  ruleRationale: string;
}

interface RegimeContext {
  regime: Regime;
  riskState: RiskState;
  confidence: number;
  rationale: string;
  date: Date;
}

type ProviderName = "gemini" | "groq" | "openrouter" | "anthropic";

interface ProviderResult {
  text: string;
  inputTokens: number;
  cachedInputTokens: number;
  outputTokens: number;
  costUsd: number;
  provider: ProviderName;
  model: string;
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

function cleanText(raw: string): string {
  return raw.trim().replace(/\s+/g, " ");
}

// ────────────────────────────────────────────────────────────────────────────
//  Gemini provider (free tier — Google AI Studio)
// ────────────────────────────────────────────────────────────────────────────
async function callGemini(
  systemPrompt: string,
  regimeBlock: string,
  userPrompt: string
): Promise<ProviderResult> {
  const model = env.GEMINI_MODEL ?? "gemini-2.0-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(env.GEMINI_API_KEY!)}`;
  const body = {
    system_instruction: { parts: [{ text: `${systemPrompt}\n\n${regimeBlock}` }] },
    contents: [{ role: "user", parts: [{ text: userPrompt }] }],
    generationConfig: { temperature: 0.4, maxOutputTokens: MAX_OUTPUT_TOKENS },
  };
  const resp = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`gemini ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number };
  };
  const text = cleanText(
    (data.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? "")
      .join(" ")
  );
  if (!text) throw new Error("gemini: empty response");
  return {
    text,
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    cachedInputTokens: 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    costUsd: 0, // free tier
    provider: "gemini",
    model,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Groq provider (free tier — OpenAI-compatible)
// ────────────────────────────────────────────────────────────────────────────
async function callGroq(
  systemPrompt: string,
  regimeBlock: string,
  userPrompt: string
): Promise<ProviderResult> {
  const model = env.GROQ_MODEL ?? "llama-3.3-70b-versatile";
  const resp = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.GROQ_API_KEY!}`,
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${regimeBlock}` },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`groq ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = cleanText(data.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("groq: empty response");
  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    cachedInputTokens: 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    costUsd: 0, // free tier
    provider: "groq",
    model,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  OpenRouter provider (free tier — OpenAI-compatible, free models via :free suffix)
// ────────────────────────────────────────────────────────────────────────────
async function callOpenRouter(
  systemPrompt: string,
  regimeBlock: string,
  userPrompt: string
): Promise<ProviderResult> {
  const model = env.OPENROUTER_MODEL ?? "deepseek/deepseek-r1:free";
  const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENROUTER_API_KEY!}`,
      // OpenRouter recommends these for routing/analytics; safe to send.
      "HTTP-Referer": env.APP_URL,
      "X-Title": "Investa Portal",
    },
    body: JSON.stringify({
      model,
      max_tokens: MAX_OUTPUT_TOKENS,
      temperature: 0.4,
      messages: [
        { role: "system", content: `${systemPrompt}\n\n${regimeBlock}` },
        { role: "user", content: userPrompt },
      ],
    }),
  });
  if (!resp.ok) {
    const errText = await resp.text().catch(() => "");
    throw new Error(`openrouter ${resp.status}: ${errText.slice(0, 200)}`);
  }
  const data = (await resp.json()) as {
    choices?: { message?: { content?: string } }[];
    usage?: { prompt_tokens?: number; completion_tokens?: number };
  };
  const text = cleanText(data.choices?.[0]?.message?.content ?? "");
  if (!text) throw new Error("openrouter: empty response");
  return {
    text,
    inputTokens: data.usage?.prompt_tokens ?? 0,
    cachedInputTokens: 0,
    outputTokens: data.usage?.completion_tokens ?? 0,
    costUsd: 0, // free-tier models on OpenRouter
    provider: "openrouter",
    model,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Anthropic provider (paid — kept as premium fallback)
// ────────────────────────────────────────────────────────────────────────────
const ANTHROPIC_MODEL = "claude-sonnet-4-6";
const ANTHROPIC_PRICE = { input: 3.0, cached: 0.30, output: 15.0 } as const; // USD / Mtok
function tokensCost(tokens: number, kind: keyof typeof ANTHROPIC_PRICE) {
  return (tokens / 1_000_000) * ANTHROPIC_PRICE[kind];
}

let _anthropic: import("@anthropic-ai/sdk").default | null = null;
function getAnthropic() {
  if (!_anthropic && env.ANTHROPIC_API_KEY) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Anthropic = require("@anthropic-ai/sdk").default;
    _anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY }) as import("@anthropic-ai/sdk").default;
  }
  return _anthropic;
}

async function callAnthropic(
  systemPrompt: string,
  regimeBlock: string,
  userPrompt: string
): Promise<ProviderResult> {
  const client = getAnthropic();
  if (!client) throw new Error("anthropic: client not initialised");
  const resp = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system: [
      { type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } },
      { type: "text", text: regimeBlock,    cache_control: { type: "ephemeral" } },
    ],
    messages: [{ role: "user", content: userPrompt }],
  });
  const text = cleanText(
    resp.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join(" ")
  );
  const usage = (resp.usage ?? {}) as {
    input_tokens?: number;
    cache_creation_input_tokens?: number;
    cache_read_input_tokens?: number;
    output_tokens?: number;
  };
  const inputTokens = usage.input_tokens ?? 0;
  const cacheCreation = usage.cache_creation_input_tokens ?? 0;
  const cacheRead = usage.cache_read_input_tokens ?? 0;
  const outputTokens = usage.output_tokens ?? 0;
  const costUsd =
    tokensCost(inputTokens, "input") +
    tokensCost(cacheCreation, "input") +
    tokensCost(cacheRead, "cached") +
    tokensCost(outputTokens, "output");
  return {
    text,
    inputTokens: inputTokens + cacheCreation,
    cachedInputTokens: cacheRead,
    outputTokens,
    costUsd,
    provider: "anthropic",
    model: ANTHROPIC_MODEL,
  };
}

// ────────────────────────────────────────────────────────────────────────────
//  Provider chain
// ────────────────────────────────────────────────────────────────────────────
function pickProviders(): ProviderName[] {
  const chain: ProviderName[] = [];
  if (env.GEMINI_API_KEY) chain.push("gemini");
  if (env.GROQ_API_KEY) chain.push("groq");
  if (env.OPENROUTER_API_KEY) chain.push("openrouter");
  if (env.ANTHROPIC_API_KEY) chain.push("anthropic");
  return chain;
}

async function callProvider(
  name: ProviderName,
  systemPrompt: string,
  regimeBlock: string,
  userPrompt: string
): Promise<ProviderResult> {
  switch (name) {
    case "gemini":     return callGemini(systemPrompt, regimeBlock, userPrompt);
    case "groq":       return callGroq(systemPrompt, regimeBlock, userPrompt);
    case "openrouter": return callOpenRouter(systemPrompt, regimeBlock, userPrompt);
    case "anthropic":  return callAnthropic(systemPrompt, regimeBlock, userPrompt);
  }
}

// ────────────────────────────────────────────────────────────────────────────
//  Spend tracking — only Anthropic counts against the budget (free providers = $0)
// ────────────────────────────────────────────────────────────────────────────
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

async function recordSpend(symbol: string, result: ProviderResult) {
  try {
    await prisma.auditLog.create({
      data: {
        action: "llm_narrate",
        entity: "signal",
        entityId: symbol,
        meta: {
          provider: result.provider,
          model: result.model,
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

export interface NarrateBatchResult {
  attempted: number;
  narrated: number;
  costUsd: number;
  skippedNoKey: boolean;
  skippedBudget: boolean;
  errors: string[];
  /** Per-provider counts, useful for /status diagnostics. */
  byProvider: Record<ProviderName, number>;
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
    byProvider: { gemini: 0, groq: 0, openrouter: 0, anthropic: 0 },
  };

  const providers = pickProviders();
  if (providers.length === 0) {
    result.skippedNoKey = true;
    logger.info({ count: signals.length }, "narration_skipped_no_key");
    return result;
  }

  // Anthropic spend cap: only matters if Anthropic is in the chain.
  const anthropicInChain = providers.includes("anthropic");
  let runningPaidSpend = anthropicInChain ? await getTodaysSpend() : 0;
  if (anthropicInChain && providers.length === 1 && runningPaidSpend >= env.LLM_DAILY_BUDGET_USD) {
    result.skippedBudget = true;
    logger.warn({ runningPaidSpend, budget: env.LLM_DAILY_BUDGET_USD }, "narration_skipped_budget_exceeded");
    return result;
  }

  const regimeBlock = regime
    ? `Today's market regime: ${regime.regime} · ${regime.riskState === "RISK_ON" ? "Risk-On" : "Risk-Off"} (model confidence ${regime.confidence.toFixed(2)}). Context: ${regime.rationale}`
    : `Today's market regime: not available.`;

  // Track per-provider failure counts so we can short-circuit a bad provider for this run.
  const providerFailures = new Map<ProviderName, number>();
  const PROVIDER_FAIL_THRESHOLD = 3;

  const symbolsToWrite: { symbol: string; date: Date; rationale: string }[] = [];

  for (const s of signals) {
    result.attempted++;
    const userPrompt = buildUserPrompt(s);

    // Try providers in priority order; skip any that has tripped the failure
    // threshold this run, or Anthropic if budget exceeded.
    let narrated: ProviderResult | null = null;
    let lastError: string | null = null;

    for (const name of providers) {
      if ((providerFailures.get(name) ?? 0) >= PROVIDER_FAIL_THRESHOLD) continue;
      if (name === "anthropic" && runningPaidSpend >= env.LLM_DAILY_BUDGET_USD) continue;

      try {
        narrated = await callProvider(name, SYSTEM_PROMPT, regimeBlock, userPrompt);
        if (name === "anthropic") runningPaidSpend += narrated.costUsd;
        break;
      } catch (e) {
        lastError = e instanceof Error ? e.message : String(e);
        providerFailures.set(name, (providerFailures.get(name) ?? 0) + 1);
        logger.warn({ symbol: s.symbol, provider: name, err: lastError }, "narration_provider_failed");
      }
    }

    if (!narrated) {
      if (lastError && result.errors.length < 20) result.errors.push(`${s.symbol}: ${lastError}`);
      continue;
    }

    result.narrated++;
    result.costUsd += narrated.costUsd;
    result.byProvider[narrated.provider]++;
    await recordSpend(s.symbol, narrated);
    symbolsToWrite.push({ symbol: s.symbol, date, rationale: narrated.text });
  }

  if (anthropicInChain && runningPaidSpend >= env.LLM_DAILY_BUDGET_USD && result.byProvider.anthropic > 0) {
    result.skippedBudget = true; // signal that the cap was hit at least once during the run
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
    {
      attempted: result.attempted,
      narrated: result.narrated,
      costUsd: result.costUsd.toFixed(4),
      byProvider: result.byProvider,
      skippedNoKey: result.skippedNoKey,
      skippedBudget: result.skippedBudget,
    },
    "narration_batch_done"
  );
  return result;
}
