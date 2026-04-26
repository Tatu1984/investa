// Intentionally no `import "server-only"` — this file is also imported by Prisma
// seed/migration tooling under tsx. The sensitive secrets it exposes (JWT secrets)
// are only consumed by code that is itself server-only (middleware, jwt util).
import { z } from "zod";

// Treat empty strings as "unset" for optional vars — common .env footgun in Zod 4.
const emptyToUndef = (v: unknown) => (typeof v === "string" && v === "" ? undefined : v);
const optionalString = (inner: z.ZodString = z.string()) => z.preprocess(emptyToUndef, inner.optional());
const optionalUrl = () => z.preprocess(emptyToUndef, z.string().url().optional());

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_URL: z.string().url().default("http://localhost:3000"),

  // Database
  DATABASE_URL: z.string().url(),

  // Auth secrets — must be ≥ 16 chars (enforce ≥ 32 in production via deploy checks)
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL_DAYS: z.coerce.number().int().min(1).max(365).default(30),

  // Cookies
  COOKIE_DOMAIN: optionalString(),
  COOKIE_SECURE: z
    .union([z.string(), z.boolean()])
    .transform((v) => (typeof v === "string" ? v === "true" : v))
    .default(false),

  // Internal analytics (FastAPI — added in a later phase)
  ANALYTICS_INTERNAL_URL: optionalUrl(),
  ANALYTICS_INTERNAL_KEY: optionalString(z.string().min(16)),

  // Optional third-party
  ANTHROPIC_API_KEY: optionalString(),
  LLM_DAILY_BUDGET_USD: z.coerce.number().default(5),

  // Cron (Vercel Cron sends Bearer CRON_SECRET automatically)
  CRON_SECRET: optionalString(z.string().min(24)),

  // Email (Resend) — wired in Phase E
  RESEND_API_KEY: optionalString(),
  RESEND_FROM: optionalString(),

  // Observability (Phase G)
  SENTRY_DSN: optionalUrl(),
  SENTRY_ENVIRONMENT: optionalString(),
  APP_VERSION: optionalString(),

  // Distributed rate-limit (Phase G — falls back to in-memory if unset)
  UPSTASH_REDIS_REST_URL: optionalUrl(),
  UPSTASH_REDIS_REST_TOKEN: optionalString(),

  // Logging
  LOG_LEVEL: z.enum(["trace", "debug", "info", "warn", "error", "fatal"]).default("info"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
    .join("\n");
  console.error("\n❌ Invalid environment variables:\n" + issues + "\n");
  throw new Error("Invalid environment variables — see above");
}

export const env = parsed.data;
export type Env = typeof env;
