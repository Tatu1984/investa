import type { NextConfig } from "next";

const isProd = process.env.NODE_ENV === "production";

// Content Security Policy — strict-ish but realistic for an app that uses fonts.google
// and Yahoo chart endpoints on the client. Update carefully.
const csp = [
  "default-src 'self'",
  // Next dev needs 'unsafe-eval' and 'unsafe-inline'; tighten in prod (move to nonces once stable).
  `script-src 'self' ${isProd ? "" : "'unsafe-eval'"} 'unsafe-inline'`,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self' https://query1.finance.yahoo.com https://archives.nseindia.com https://portal.amfiindia.com https://www.amfiindia.com",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  ...(isProd
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  reactCompiler: true,

  async headers() {
    return [
      // Apply to everything
      { source: "/(.*)", headers: securityHeaders },
      // No caching on API (problem+json should never be cached by middleboxes)
      { source: "/api/(.*)", headers: [{ key: "Cache-Control", value: "no-store" }] },
    ];
  },
};

export default nextConfig;
