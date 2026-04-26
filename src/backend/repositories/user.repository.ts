import { prisma } from "@/backend/database/client";

export const userRepository = {
  findByEmail: (email: string) =>
    prisma.user.findFirst({ where: { email, deletedAt: null } }),

  findById: (id: string) =>
    prisma.user.findFirst({ where: { id, deletedAt: null } }),

  create: (data: { email: string; name: string; passwordHash: string }) =>
    prisma.user.create({ data }),

  updatePassword: (id: string, passwordHash: string) =>
    prisma.user.update({ where: { id }, data: { passwordHash } }),
};
