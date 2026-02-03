import type { PrismaClient } from "@prisma/client";

export async function createUser(prisma: PrismaClient, overrides = {}) {
  return prisma.userEntity.create({
    data: {
      name: "Test User",
      email: "test@example.com",
      password: "$2b$12$iW/gX4kWXoP8/3lEMuNXiumHmA068Z.MIH7ojA2KnIqqzx9m1yhB.", // password
      isActive: true,
      validatedAt: new Date(),
      ...overrides,
    },
  });
}
