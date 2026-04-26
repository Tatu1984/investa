import { z } from "zod";

const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password too long");

export const RegisterSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  name: z.string().min(1).max(120).trim(),
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof RegisterSchema>;

export const LoginSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
  password: z.string().min(1).max(128),
});
export type LoginInput = z.infer<typeof LoginSchema>;

export const ForgotPasswordSchema = z.object({
  email: z.string().email().max(254).transform((s) => s.toLowerCase().trim()),
});

export const ResetPasswordSchema = z.object({
  token: z.string().min(10),
  newPassword: passwordSchema,
});
