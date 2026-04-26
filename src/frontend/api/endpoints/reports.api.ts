"use client";
import { api } from "@/frontend/api/client";

export interface ReportDto {
  date: string;
  title: string;
  summary: string;
  sections: Record<string, string>;
  publishedAt: string | null;
}

export interface EmailResult {
  to: string;
  status: "sent" | "stub" | "failed";
  provider: "resend" | "stub";
  providerId?: string;
  error?: string;
}

export const reportsApi = {
  list: (limit = 30) => api.get<{ data: ReportDto[] }>("/reports", { params: { limit } }).then((r) => r.data.data),
  byDate: (date: string) => api.get<{ data: ReportDto }>(`/reports/${date}`).then((r) => r.data.data),
  /** Returns a streaming PDF URL. Browsers can navigate directly; fetch() gets a blob. */
  pdfUrl: (date: string) => `/api/v1/reports/${date}/pdf`,
  emailSelf: (date: string) =>
    api.post<{ data: EmailResult }>(`/reports/${date}/email`).then((r) => r.data.data),
};
