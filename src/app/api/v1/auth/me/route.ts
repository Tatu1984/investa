import { withAuth, ok } from "@/backend/api/middleware";
import { authService } from "@/backend/services/auth.service";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  const user = await authService.me(ctx.user!.sub);
  return ok({ user }, ctx);
});
