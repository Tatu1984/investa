import { NextRequest } from "next/server";
import { withRateLimit, ok } from "@/backend/api/middleware";
import { ResetPasswordSchema } from "@/backend/validators/auth.validator";
import { completeReset } from "@/backend/services/password-reset.service";
import { RULES } from "@/backend/utils/rate-limit.util";

export const runtime = "nodejs";

export const POST = withRateLimit(RULES.SIGNUP, async (req: NextRequest, ctx) => {
  const input = ResetPasswordSchema.parse(await req.json());
  await completeReset(input.token, input.newPassword);
  return ok({ status: "ok" }, ctx);
});
