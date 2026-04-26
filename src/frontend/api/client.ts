"use client";
import axios, { AxiosError, type AxiosRequestConfig } from "axios";

export const api = axios.create({
  baseURL: "/api/v1",
  withCredentials: true,        // send HttpOnly cookies
  headers: { "content-type": "application/json" },
  timeout: 20_000,
});

// 401 → try refresh once, replay the original request.
let refreshing: Promise<void> | null = null;

api.interceptors.response.use(
  (r) => r,
  async (error: AxiosError) => {
    const original = error.config as (AxiosRequestConfig & { _retried?: boolean }) | undefined;

    if (error.response?.status !== 401 || !original || original._retried) {
      return Promise.reject(error);
    }
    // Don't refresh the refresh/login/logout endpoints themselves.
    if (typeof original.url === "string" && /\/auth\/(refresh|login|logout|register)$/.test(original.url)) {
      return Promise.reject(error);
    }

    try {
      refreshing ||= api.post("/auth/refresh").then(() => undefined);
      await refreshing;
      original._retried = true;
      return api.request(original);
    } catch (e) {
      return Promise.reject(e);
    } finally {
      refreshing = null;
    }
  }
);
