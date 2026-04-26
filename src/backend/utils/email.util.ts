import { prisma } from "@/backend/database/client";
import { env } from "@/config/env";
import { logger } from "./logger.util";

export interface SendEmailInput {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  /** Optional array of attachments. Each attachment needs `filename` and either `content` (Buffer | base64) or `path`. */
  attachments?: Array<{ filename: string; content: Buffer | string; contentType?: string }>;
}

export interface SendEmailResult {
  status: "sent" | "stub" | "failed";
  provider: "resend" | "stub";
  providerId?: string;
  error?: string;
}

/**
 * Email abstraction.
 *   - If RESEND_API_KEY is set, sends via Resend.
 *   - Otherwise logs the email and persists to `sent_emails` with status="stub"
 *     — useful in dev before you've wired Resend, and still visible in /admin.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  if (env.RESEND_API_KEY) {
    try {
      // Dynamic import to avoid bundling resend when not configured.
      const { Resend } = await import("resend");
      const client = new Resend(env.RESEND_API_KEY);
      const from = env.RESEND_FROM ?? "Investa <no-reply@investa.local>";
      // Resend's send() type is a union requiring html|text|react|template — cast so TS is happy.
      const payload: Record<string, unknown> = {
        from, to: [input.to], subject: input.subject,
      };
      if (input.html) payload.html = input.html;
      if (input.text) payload.text = input.text;
      if (input.attachments?.length) {
        payload.attachments = input.attachments.map((a) => ({
          filename: a.filename,
          content: typeof a.content === "string" ? a.content : a.content.toString("base64"),
        }));
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await client.emails.send(payload as any);
      if (error) {
        await persist({ ...input, status: "failed", provider: "resend", error: error.message });
        return { status: "failed", provider: "resend", error: error.message };
      }
      await persist({ ...input, status: "sent", provider: "resend", providerId: data?.id });
      logger.info({ to: input.to, subject: input.subject, id: data?.id }, "email_sent");
      return { status: "sent", provider: "resend", providerId: data?.id };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await persist({ ...input, status: "failed", provider: "resend", error: msg });
      logger.error({ to: input.to, err: msg }, "email_send_failed");
      return { status: "failed", provider: "resend", error: msg };
    }
  }

  // Stub mode — persist so it's visible in /admin and in logs
  await persist({ ...input, status: "stub", provider: "stub" });
  logger.warn(
    { to: input.to, subject: input.subject },
    "email_stub (RESEND_API_KEY not set — email was captured but NOT delivered)"
  );
  return { status: "stub", provider: "stub" };
}

async function persist(row: {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  status: "sent" | "failed" | "stub";
  provider: "resend" | "stub";
  providerId?: string;
  error?: string;
}) {
  try {
    const body = row.html ?? row.text ?? "";
    await prisma.sentEmail.create({
      data: {
        to: row.to,
        subject: row.subject,
        body: body.slice(0, 20_000),  // cap at 20 KB
        provider: row.provider,
        providerId: row.providerId ?? null,
        status: row.status,
        error: row.error ?? null,
      },
    });
  } catch {
    // Best-effort — we already logged.
  }
}
