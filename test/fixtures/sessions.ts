import type { PrismaClient } from "@prisma/client";

export async function createSession(prisma: PrismaClient, overrides = {}) {
  return prisma.sessionEntity.create({
    data: {
      sessionId:
        "3b8e86cee1008f4add159957c0621a2d1470e7d8e34a06134dbf1cb202964bad",
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24), // 1 day
      userId: "b2kgx5476bst2jhgp0po7uz9",
      fingerprint: "test-fingerprint",
      userAgent: "test-user-agent",
      refreshToken:
        "4389a7cbb38cf1497f0a9c5ea5759c09c3df9f11e57fd14c4f980430f64e240018a389de2221c471a88804456f31b4debf9969c6ed98fdcc999ab44ce4d7f148",
      ip: "127.0.0.1",
      ...overrides,
    },
  });
}
