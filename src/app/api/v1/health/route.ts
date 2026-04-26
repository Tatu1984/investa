import { withApi, ok } from "@/backend/api/middleware";

export const runtime = "nodejs";

export const GET = withApi(async (_req, ctx) => {
  return ok(
    { status: "ok", service: "investa-portal", ts: new Date().toISOString() },
    ctx
  );
});
