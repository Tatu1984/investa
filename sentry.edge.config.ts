// Sentry init for the Edge runtime (used by middleware).
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
    sendDefaultPii: false,
  });
}
