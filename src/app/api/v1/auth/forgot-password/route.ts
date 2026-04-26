import { NextRequest } from "next/server";
import { withRateLimit, ok } from "@/backend/api/middleware";
import { ForgotPasswordSchema } from "@/backend/validators/auth.validator";
import { startReset } from "@/backend/services/password-reset.service";
import { RULES } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

// Reuse the signup rule — same order of magnitude (5/hour/ip).
export const POST = withRateLimit(RULES.SIGNUP, async (req: NextRequest, ctx) => {
  const input = ForgotPasswordSchema.parse(await req.json());
  await startReset(input.email);
  // Always 200 — never reveal whether the email exists.
  return ok({ status: "ok" }, ctx);
});
