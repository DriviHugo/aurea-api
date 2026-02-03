import { closeApp } from "./fastify";
import { resetDatabase, closePrisma } from "./prisma";
import { resetRedis, closeRedis } from "./redis";

beforeAll(async () => {
  await resetDatabase();
  await resetRedis();
});

afterAll(async () => {
  await closeApp();
  await closePrisma();
  await closeRedis();
});
