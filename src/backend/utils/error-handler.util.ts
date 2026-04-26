import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { logger } from "./logger.util";

// RFC 7807 Problem+JSON shape
export interface Problem {
  type: string;
  title: string;
  status: number;
  detail?: string;
  instance?: string;
  requestId?: string;
  errors?: Array<{ path: string; message: string }>;
}

export class ApiError extends Error {
  status: number;
  code: string;
  detail?: string;
  constructor(status: number, code: string, message: string, detail?: string) {
    super(message);
    this.status = status;
    this.code = code;
    this.detail = detail;
  }
}

export const Unauthorized = (detail?: string) =>
  new ApiError(401, "unauthorized", "Unauthorized", detail);
export const Forbidden = (detail?: string) =>
  new ApiError(403, "forbidden", "Forbidden", detail);
export const NotFound = (detail?: string) =>
  new ApiError(404, "not_found", "Not found", detail);
export const Conflict = (detail?: string) =>
  new ApiError(409, "conflict", "Conflict", detail);
export const ValidationError = (detail?: string) =>
  new ApiError(422, "validation_error", "Validation error", detail);

export function problem(status: number, title: string, detail?: unknown, requestId?: string) {
  const body: Problem = {
    type: `about:blank#${title.toLowerCase().replace(/\s+/g, "-")}`,
    title,
    status,
    requestId,
  };
  if (detail instanceof ZodError) {
    body.detail = "Invalid input";
    body.errors = detail.issues.map((i) => ({ path: i.path.join("."), message: i.message }));
  } else if (typeof detail === "string") {
    body.detail = detail;
  } else if (detail && typeof detail === "object" && "message" in detail) {
    body.detail = String((detail as { message: unknown }).message);
  }
  return NextResponse.json(body, {
    status,
    headers: {
      "content-type": "application/problem+json",
      ...(requestId ? { "x-request-id": requestId } : {}),
    },
  });
}

export function json<T>(data: T, init?: { status?: number; requestId?: string; headers?: HeadersInit }) {
  const headers = new Headers(init?.headers);
  if (init?.requestId) headers.set("x-request-id", init.requestId);
  return NextResponse.json(data, { status: init?.status ?? 200, headers });
}

export function handleError(err: unknown, requestId?: string) {
  if (err instanceof ApiError) {
    if (err.status >= 500) logger.error({ err, requestId }, err.code);
    else logger.warn({ err: { message: err.message, code: err.code }, requestId }, err.code);
    return problem(err.status, err.message, err.detail, requestId);
  }
  if (err instanceof ZodError) {
    return problem(422, "Validation error", err, requestId);
  }
  logger.error({ err, requestId }, "unhandled_error");
  return problem(500, "Internal server error", "Something went wrong", requestId);
}
