export interface IngestResult {
  source: "amfi" | "nse" | "yahoo";
  startedAt: string;
  finishedAt: string;
  durationMs: number;
  assetsUpserted: number;
  pricesUpserted: number;
  errors: string[];
  notes?: string[];
}

export class IngestError extends Error {
  constructor(public source: string, message: string, public cause?: unknown) {
    super(message);
    this.name = "IngestError";
  }
}
