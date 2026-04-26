import "server-only";
import { nanoid } from "nanoid";

export function getOrCreateRequestId(headers: Headers): string {
  return headers.get("x-request-id") ?? `req_${nanoid(16)}`;
}
