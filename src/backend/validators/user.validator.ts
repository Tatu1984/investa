import { z } from "zod";

export const UpdateMeSchema = z.object({
  name: z.string().min(1).max(120).trim().optional(),
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()).optional(),
});

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(128),
  newPassword: z.string().min(8).max(128),
});
