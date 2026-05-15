/**
 * Token Blacklist — Redis-backed refresh token revocation.
 *
 * When a session is terminated (logout, admin revocation) the token's jti is
 * stored in Redis with a TTL equal to the remaining lifetime of the refresh
 * token. Both the access-token and refresh-token plugins check this list so
 * that a compromised token becomes invalid immediately after logout rather
 * than expiring naturally.
 */

import { pubClient } from "../redis.js";
import { REFRESH_TOKEN_EXPIRATION_IN_SECONDS } from "../utils/jwt.js";

const KEY_PREFIX = "blacklist:jti:";

/**
 * Add a session jti to the blacklist.
 * TTL defaults to the full refresh-token lifetime (worst-case window).
 */
export async function blacklistJti(
  jti: string,
  ttlSeconds = REFRESH_TOKEN_EXPIRATION_IN_SECONDS,
): Promise<void> {
  await pubClient.set(`${KEY_PREFIX}${jti}`, "1", "EX", ttlSeconds);
}

/**
 * Check whether a jti has been blacklisted (i.e. the session was revoked).
 */
export async function isJtiBlacklisted(jti: string): Promise<boolean> {
  const value = await pubClient.get(`${KEY_PREFIX}${jti}`);
  return value !== null;
}
