import { pubClient, subClient } from "../../src/redis";

export async function resetRedis(): Promise<void> {
  await pubClient.flushdb();
  await subClient.flushdb();
}

export async function closeRedis(): Promise<void> {
  await pubClient.quit();
  await subClient.quit();
}
