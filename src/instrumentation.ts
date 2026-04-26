// Next.js calls this once when the server starts.
// We use it to wire Sentry, but only if SENTRY_DSN is configured.
export async function register() {
  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs") {
    await import("../sentry.server.config");
  } else if (process.env.NEXT_RUNTIME === "edge") {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  error: unknown,
  request: { path?: string; method?: string; headers?: Record<string, string> }
) {
  if (!process.env.SENTRY_DSN) return;
  const Sentry = await import("@sentry/nextjs");
  Sentry.captureException(error, {
    tags: { path: request.path, method: request.method },
  });
}
