import * as Redis from "ioredis";
const { Redis: RedisClient } = Redis;

type RedisInstance = InstanceType<typeof RedisClient>;

const redisConfigured = !!process.env["REDIS_HOST"]?.trim();

let pubClient: RedisInstance | null = null;
let subClient: RedisInstance | null = null;

if (redisConfigured) {
  const redisHost = process.env["REDIS_HOST"]!;
  const redisPort = process.env["REDIS_PORT"] ?? "6379";
  const redisUrl = `redis://${redisHost}:${redisPort}`;

  pubClient = new RedisClient(redisUrl);
  subClient = new RedisClient(redisUrl);

  pubClient.on("error", (error: Error) => {
    throw error;
  });
  subClient.on("error", (error: Error) => {
    throw error;
  });

  pubClient.setMaxListeners(0);
  subClient.setMaxListeners(0);

  // Optionally configure keyspace notifications for subClient
  subClient.config("SET", "notify-keyspace-events", "KEA").catch(() => {});
} else {
  console.warn(
    "[Redis] REDIS_HOST not set — Redis disabled. Token blacklisting will be skipped.",
  );
}

export { pubClient, subClient, redisConfigured };
