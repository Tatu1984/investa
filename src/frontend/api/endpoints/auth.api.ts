"use client";
import { api } from "@/frontend/api/client";
import type { AuthResponse, AuthUser } from "@/frontend/api/types/auth.types";

export const authApi = {
  register: (input: { email: string; name: string; password: string }) =>
    api.post<AuthResponse>("/auth/register", input).then((r) => r.data),

  login: (input: { email: string; password: string }) =>
    api.post<AuthResponse>("/auth/login", input).then((r) => r.data),

  logout: () => api.post<null>("/auth/logout").then(() => null),

  me: () => api.get<{ user: AuthUser }>("/auth/me").then((r) => r.data.user),

  refresh: () => api.post<AuthResponse>("/auth/refresh").then((r) => r.data),

  forgotPassword: (email: string) =>
    api.post<{ status: "ok" }>("/auth/forgot-password", { email }).then((r) => r.data),

  resetPassword: (input: { token: string; newPassword: string }) =>
    api.post<{ status: "ok" }>("/auth/reset-password", input).then((r) => r.data),
};
