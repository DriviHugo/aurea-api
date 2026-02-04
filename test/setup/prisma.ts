// setup/prisma.ts
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({
  connectionString: process.env["DATABASE_URL"]!,
});

export const prisma = new PrismaClient({ adapter });

export async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.sessionEntity.deleteMany(),
    prisma.userEntity.deleteMany(),
  ]);
}

export async function closePrisma(): Promise<void> {
  await prisma.$disconnect();
}
