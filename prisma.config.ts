import path from "node:path";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "prisma/config";

// Prisma 7: datasource URL lives here, not in schema.prisma.
// Load .env.local first (Next.js convention), fall back to .env.
loadEnv({ path: path.join(process.cwd(), ".env.local") });
loadEnv({ path: path.join(process.cwd(), ".env") });

const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  // Prisma CLI will surface a clearer error anyway — this is a soft-warn.
  console.warn(
    "⚠️  DATABASE_URL is not set. Set it in .env.local (Neon Postgres URL) before running prisma commands."
  );
}

export default defineConfig({
  schema: path.join("src", "backend", "database", "prisma", "schema.prisma"),
  migrations: {
    path: path.join("src", "backend", "database", "prisma", "migrations"),
    seed: "tsx src/backend/database/seed.ts",
  },
  datasource: { url: DATABASE_URL ?? "" },
});
