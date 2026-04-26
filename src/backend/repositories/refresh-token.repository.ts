import { prisma } from "@/backend/database/client";

export const refreshTokenRepository = {
  create: (data: {
    userId: string;
    tokenHash: string;
    expiresAt: Date;
    userAgent?: string | null;
    ipAddress?: string | null;
  }) => prisma.refreshToken.create({ data }),

  findValidByHash: async (tokenHash: string) => {
    const t = await prisma.refreshToken.findUnique({ where: { tokenHash } });
    if (!t) return null;
    if (t.revokedAt) return null;
    if (t.expiresAt.getTime() < Date.now()) return null;
    return t;
  },

  revokeById: (id: string) =>
    prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } }),

  revokeAllForUser: (userId: string) =>
    prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
};
