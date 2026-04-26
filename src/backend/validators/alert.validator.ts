import { z } from "zod";

export const CreateAlertSchema = z.object({
  symbol: z.string().min(1).max(64).trim().toUpperCase(),
  type: z.enum(["signal_change", "risk_flag", "trend_reversal"]),
  threshold: z.string().max(120).optional(),
  channel: z.enum(["in_app", "email", "both"]).default("in_app"),
  active: z.boolean().default(true),
});

export const UpdateAlertSchema = z.object({
  threshold: z.string().max(120).optional(),
  channel: z.enum(["in_app", "email", "both"]).optional(),
  active: z.boolean().optional(),
});
