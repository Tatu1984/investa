// NOTE: no `import "server-only"` here — this file is also imported by the Prisma seed
// script via tsx (no Next bundler). The real server-only guard lives in middleware.ts,
// jwt.util.ts, cookies.util.ts etc., which prevents any client module from reaching auth.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { env } from "@/config/env";

// Prisma 7: construct the PG driver adapter with the URL from our Zod-validated env.
// We cache the instance in dev to avoid exhausting connections on HMR.

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = global.__prisma ?? createPrismaClient();

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
