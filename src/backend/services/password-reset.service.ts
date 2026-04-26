import { prisma } from "@/backend/database/client";
import { env } from "@/config/env";
import { hashPassword, randomToken, sha256Hex } from "@/backend/utils/hash.util";
import { sendEmail } from "@/backend/utils/email.util";
import { refreshTokenRepository } from "@/backend/repositories/refresh-token.repository";
import { logger } from "@/backend/utils/logger.util";
import { ApiError } from "@/backend/utils/error-handler.util";

const TTL_MIN = 60;

/**
 * Create a single-use password-reset token, email the link.
 * Always returns the same shape regardless of whether the email exists (prevents enumeration).
 */
export async function startReset(email: string) {
  const user = await prisma.user.findFirst({ where: { email, deletedAt: null } });
  if (!user) {
    logger.info({ email }, "password_reset_requested_for_unknown_email");
    return { status: "ok" as const };
  }

  // Best practice: invalidate any outstanding unused reset tokens for this user first.
  await prisma.passwordResetToken.updateMany({
    where: { userId: user.id, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });

  const raw = randomToken(32);
  const tokenHash = sha256Hex(raw);
  const expiresAt = new Date(Date.now() + TTL_MIN * 60 * 1000);
  await prisma.passwordResetToken.create({ data: { userId: user.id, tokenHash, expiresAt } });

  const link = `${env.APP_URL}/reset-password?token=${encodeURIComponent(raw)}`;
  await sendEmail({
    to: user.email,
    subject: "Reset your Investa password",
    html: `
      <div style="font-family: Inter, -apple-system, Arial, sans-serif; color:#1a1f2c; max-width:560px; margin:0 auto;">
        <div style="font-size:10px; color:#7a7f8c; text-transform:uppercase; letter-spacing:1px;">Investa</div>
        <h1 style="font-size:20px; margin:6px 0 12px;">Reset your password</h1>
        <p style="line-height:1.55;">
          We got a request to reset the password for <strong>${user.email}</strong>.
          Click the button below within ${TTL_MIN} minutes to set a new one.
          If you didn't ask for this, ignore this email — your account stays as-is.
        </p>
        <p style="margin:24px 0;">
          <a href="${link}" style="display:inline-block; padding:10px 18px; background:#1a1f2c; color:#fff; text-decoration:none; border-radius:8px; font-weight:600;">Reset password</a>
        </p>
        <p style="font-size:11px; color:#8a8f99; line-height:1.55;">
          Or paste this link: <br><code>${link}</code>
        </p>
      </div>
    `,
    text: `Reset your Investa password (valid for ${TTL_MIN} min): ${link}`,
  });

  logger.info({ userId: user.id }, "password_reset_email_sent");
  return { status: "ok" as const };
}

/**
 * Consume a reset token, change the password, revoke all refresh tokens.
 */
export async function completeReset(rawToken: string, newPassword: string) {
  const tokenHash = sha256Hex(rawToken);
  const row = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) {
    throw new ApiError(401, "invalid_token", "Invalid or expired reset token");
  }

  const newHash = await hashPassword(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { id: row.userId }, data: { passwordHash: newHash } }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
  ]);

  // Kick every existing session.
  await refreshTokenRepository.revokeAllForUser(row.userId);

  logger.info({ userId: row.userId }, "password_reset_completed");
  return { status: "ok" as const };
}
