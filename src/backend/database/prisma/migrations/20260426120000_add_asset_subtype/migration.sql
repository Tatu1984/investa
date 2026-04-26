-- Adds Asset.subType for category-aware filtering (largeCap / midCap / smallCap
-- for equities; largeCapFund / midCapFund / etc for MFs).
ALTER TABLE "assets" ADD COLUMN "subType" TEXT;
CREATE INDEX "assets_subType_idx" ON "assets"("subType");
