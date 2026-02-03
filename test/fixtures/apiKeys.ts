import type { PrismaClient } from "@prisma/client";
import { generateRandomHexToken, hashPassword } from "../../src/utils/crypto";

export async function createApiKey(
  prisma: PrismaClient,
  key: string = generateRandomHexToken(32),
  overrides = {},
) {
  return prisma.apiKeyEntity.create({
    data: {
      name: "Test API Key",
      keyHash: await hashPassword(key),
      allowedIps: ["127.0.0.1"],
      allowedDomains: ["localhost"],
      isActive: true,
      scopes: ["read", "write"],
      ...overrides,
    },
  });
}
