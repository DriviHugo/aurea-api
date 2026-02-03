import * as Redis from "ioredis";
const { Redis: RedisClient } = Redis;

const redisHost = process.env["REDIS_HOST"] ?? "localhost";
const redisPort = process.env["REDIS_PORT"] ?? "6379";
const redisUrl = `redis://${redisHost}:${redisPort}`;

const pubClient = new RedisClient(redisUrl);
const subClient = new RedisClient(redisUrl);

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

export { pubClient, subClient };
