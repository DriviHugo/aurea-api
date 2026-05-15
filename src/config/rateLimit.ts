/**
 * Rate Limiting Configuration
 * Protects sensitive endpoints from abuse and brute force attacks
 */

export const rateLimitConfig = {
  // Global cache for rate limiting (in-memory)
  cache: 10000, // Number of records to store

  // Default rate limits
  default: {
    max: 100,
    timeWindow: "15 minutes",
  },

  // Authentication endpoints (stricter)
  auth: {
    login: {
      max: 5,
      timeWindow: "15 minutes",
    },
    refresh: {
      max: 10,
      timeWindow: "1 minute",
    },
  },

  // AI function endpoints (moderate)
  ai: {
    max: 10,
    timeWindow: "1 hour",
  },

  // Document generation (moderate)
  documents: {
    max: 20,
    timeWindow: "1 hour",
  },
};

/**
 * Converts rate limit config to Fastify @fastify/rate-limit format
 * Returns false to indicate the request should be rate limited (rejected)
 */
export function shouldRateLimit(
  request: { ip: string; method?: string; url?: string },
  reply: any,
  limit: { max: number; timeWindow: string },
): boolean | undefined {
  // The @fastify/rate-limit plugin will handle the actual limiting
  // This is just config export for documentation
  return undefined; // undefined = not rate limited
}
