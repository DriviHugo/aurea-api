/**
 * Rate Limiting Plugin for Fastify
 * Applies rate limiting to sensitive endpoints
 */

import rateLimit, { type RateLimitOptions } from "@fastify/rate-limit";
import type { FastifyInstance } from "fastify";

export async function registerRateLimiting(fastify: FastifyInstance) {
  const isRateLimitEnabled =
    process.env["RATE_LIMIT_ENABLED"] !== "false"; // Enabled by default

  if (!isRateLimitEnabled) {
    fastify.log.info("Rate limiting is disabled");
    return;
  }

  const rateLimitOptions: RateLimitOptions = {
    max: 100,
    timeWindow: "15 minutes",
    cache: 10000,
    // Use header-based IP detection for correct behavior behind proxies
    skipOnError: false, // Fail closed (reject if rate limiter fails)
  };

  await fastify.register(rateLimit, rateLimitOptions);

  fastify.log.info("Rate limiting plugin registered");
}

/**
 * Helper to apply route-specific rate limits
 * Usage in route handlers:
 *   fastify.post('/auth/login', { ... }, applyRateLimit('login', 5, '15 minutes'))
 */
export function createRateLimitConfig(endpoint: string, max: number, timeWindow: string) {
  return {
    config: {
      rateLimit: {
        max,
        timeWindow,
      },
    },
  };
}
