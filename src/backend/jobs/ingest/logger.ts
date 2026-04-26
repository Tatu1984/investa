import { prisma } from "@/backend/database/client";
import type { IngestResult } from "./types";

export async function recordIngest(result: IngestResult, triggeredBy: string) {
  try {
    await prisma.ingestLog.create({
      data: {
        source: result.source,
        startedAt: new Date(result.startedAt),
        finishedAt: new Date(result.finishedAt),
        durationMs: result.durationMs,
        assetsUpserted: result.assetsUpserted,
        pricesUpserted: result.pricesUpserted,
        errors: result.errors,
        notes: result.notes ?? [],
        triggeredBy,
      },
    });
  } catch {
    // Non-fatal — ingestion itself already succeeded.
  }
}
