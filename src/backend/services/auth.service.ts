import { env } from "@/config/env";
import { userRepository } from "@/backend/repositories/user.repository";
import { refreshTokenRepository } from "@/backend/repositories/refresh-token.repository";
import { hashPassword, verifyPassword, sha256Hex, randomToken } from "@/backend/utils/hash.util";
import { signAccessToken } from "@/backend/utils/jwt.util";
import { Conflict, Unauthorized } from "@/backend/utils/error-handler.util";
import type { RegisterInput, LoginInput } from "@/backend/validators/auth.validator";
import { logger } from "@/backend/utils/logger.util";

interface ReqContext {
  userAgent?: string | null;
  ipAddress?: string | null;
}

export interface AuthResult {
  user: { id: string; email: string; name: string; role: "USER" | "ADMIN" };
  accessToken: string;
  refreshToken: string;
  refreshExpiresAt: Date;
}

async function issueTokens(user: { id: string; email: string; role: "USER" | "ADMIN" }, ctx: ReqContext): Promise<AuthResult> {
  const accessToken = await signAccessToken({ sub: user.id, email: user.email, role: user.role });

  const refreshToken = randomToken(48);
  const refreshHash = sha256Hex(refreshToken);
  const refreshExpiresAt = new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 24 * 3600 * 1000);

  await refreshTokenRepository.create({
    userId: user.id,
    tokenHash: refreshHash,
    expiresAt: refreshExpiresAt,
    userAgent: ctx.userAgent ?? null,
    ipAddress: ctx.ipAddress ?? null,
  });

  return {
    user: { id: user.id, email: user.email, name: "", role: user.role },
    accessToken,
    refreshToken,
    refreshExpiresAt,
  };
}

export const authService = {
  async register(input: RegisterInput, ctx: ReqContext): Promise<AuthResult> {
    const existing = await userRepository.findByEmail(input.email);
    if (existing) throw Conflict("An account with this email already exists");

    const passwordHash = await hashPassword(input.password);
    const user = await userRepository.create({
      email: input.email,
      name: input.name,
      passwordHash,
    });
    logger.info({ userId: user.id }, "user_registered");

    const tokens = await issueTokens(user, ctx);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async login(input: LoginInput, ctx: ReqContext): Promise<AuthResult> {
    const user = await userRepository.findByEmail(input.email);
    const GENERIC = Unauthorized("Invalid email or password");
    if (!user) throw GENERIC;
    const ok = await verifyPassword(user.passwordHash, input.password);
    if (!ok) throw GENERIC;

    logger.info({ userId: user.id }, "user_login");
    const tokens = await issueTokens(user, ctx);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async refresh(refreshToken: string, ctx: ReqContext): Promise<AuthResult> {
    const hash = sha256Hex(refreshToken);
    const record = await refreshTokenRepository.findValidByHash(hash);
    if (!record) throw Unauthorized("Refresh token invalid or expired");

    // Rotation — revoke the old token, issue a new pair
    await refreshTokenRepository.revokeById(record.id);

    const user = await userRepository.findById(record.userId);
    if (!user) throw Unauthorized("User no longer exists");

    const tokens = await issueTokens(user, ctx);
    return { ...tokens, user: { id: user.id, email: user.email, name: user.name, role: user.role } };
  },

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const hash = sha256Hex(refreshToken);
    const record = await refreshTokenRepository.findValidByHash(hash);
    if (record) await refreshTokenRepository.revokeById(record.id);
  },

  async me(userId: string) {
    const user = await userRepository.findById(userId);
    if (!user) throw Unauthorized();
    return { id: user.id, email: user.email, name: user.name, role: user.role };
  },
};
