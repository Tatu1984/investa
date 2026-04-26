"use client";
import { api } from "@/frontend/api/client";
import type { AuthUser } from "@/frontend/api/types/auth.types";

export const usersApi = {
  updateMe: (input: { name?: string; email?: string }) =>
    api.patch<{ user: AuthUser }>("/users/me", input).then((r) => r.data.user),
  changePassword: (input: { currentPassword: string; newPassword: string }) =>
    api.post<null>("/users/me/password", input).then(() => null),
};
