// Provide the bare-minimum env that env.ts demands so unit tests don't blow up
// just because they transitively import a module that touches `env`.
// Using bracket access avoids the read-only NODE_ENV typing in TS lib defs.
const e = process.env as Record<string, string | undefined>;
e.NODE_ENV ??= "test";
e.DATABASE_URL ??= "postgres://test:test@localhost/test";
e.JWT_ACCESS_SECRET ??= "test-access-secret-must-be-at-least-32-chars-long";
e.JWT_REFRESH_SECRET ??= "test-refresh-secret-must-be-at-least-32-chars-long";
e.APP_URL ??= "http://localhost:3000";
