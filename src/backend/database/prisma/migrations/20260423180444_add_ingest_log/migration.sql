-- CreateTable
CREATE TABLE "ingest_log" (
    "id" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL,
    "finishedAt" TIMESTAMP(3) NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "assetsUpserted" INTEGER NOT NULL,
    "pricesUpserted" INTEGER NOT NULL,
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "notes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "triggeredBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ingest_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ingest_log_source_createdAt_idx" ON "ingest_log"("source", "createdAt");
