// Sentry init for the Node/server runtime.
// Only loaded if SENTRY_DSN is set — keeps dev silent and avoids paying for noise.
import * as Sentry from "@sentry/nextjs";

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV,
    release: process.env.APP_VERSION,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Strip cookies / auth headers — defense-in-depth.
      if (event.request?.cookies) delete event.request.cookies;
      const headers = event.request?.headers ?? {};
      if ("authorization" in headers) delete (headers as Record<string, string>).authorization;
      if ("cookie" in headers) delete (headers as Record<string, string>).cookie;
      return event;
    },
  });
}
