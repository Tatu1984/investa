import { withAuth, ok } from "@/backend/api/middleware";
import { dashboardService } from "@/backend/services/dashboard.service";

export const runtime = "nodejs";

export const GET = withAuth(async (_req, ctx) => {
  // Reuse the dashboard's sector strength computation.
  const s = await dashboardService.summary();
  return ok({ data: s.sectorStrength }, ctx);
});
