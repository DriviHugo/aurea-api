import type { FastifyRequest, FastifyReply } from "fastify";
import { RateLimiterRedis, RateLimiterRes } from "rate-limiter-flexible";
import { pubClient } from "../redis.js";
import type { LoginBody } from "../schema/auth.js";

const HOUR_IN_SECONDS = 60 * 60;
const DAY_IN_SECONDS = 60 * 60 * 24;
const MAX_LOGIN_REQUESTS_PER_DAY = 100;
const MAX_LOGIN_CONSECUTIVE_REQUESTS = 10;
const MAX_REGISTER_REQUESTS_PER_DAY = 10;
const MAX_FORGOT_PASSWORD_REQUESTS_PER_DAY = 5;
const MAX_PUBLIC_REQUESTS_PER_HOUR = 30;
// const MAX_RESEND_VALIDATION_REQUESTS_PER_HOUR = 5;

// Limit the total login attempts by IP (massive attacks)
const limiterSlowBruteByIP = new RateLimiterRedis({
  keyPrefix: "login-rate-limits-ip",
  storeClient: pubClient,
  blockDuration: DAY_IN_SECONDS,
  duration: DAY_IN_SECONDS,
  points: MAX_LOGIN_REQUESTS_PER_DAY,
});

// Limit the total login attempts by fingerprint (distributed dictionary attacks)
const MAX_LOGIN_ATTEMPTS_PER_FINGERPRINT = 20;
const limiterByFingerprint = new RateLimiterRedis({
  keyPrefix: "login-rate-limits-fp",
  storeClient: pubClient,
  blockDuration: HOUR_IN_SECONDS,
  duration: HOUR_IN_SECONDS,
  points: MAX_LOGIN_ATTEMPTS_PER_FINGERPRINT,
});

// Limit the failed login attempts by user+fingerprint (targeted attacks)
const limiterConsecutiveFailsByUsernameAndFingerprint = new RateLimiterRedis({
  keyPrefix: "login-rate-limits-userfp",
  storeClient: pubClient,
  blockDuration: HOUR_IN_SECONDS,
  duration: DAY_IN_SECONDS * 90,
  points: MAX_LOGIN_CONSECUTIVE_REQUESTS,
});

const limiterRegisterByIP = new RateLimiterRedis({
  blockDuration: DAY_IN_SECONDS,
  duration: DAY_IN_SECONDS,
  keyPrefix: "register-rate-limits",
  points: MAX_REGISTER_REQUESTS_PER_DAY,
  storeClient: pubClient,
});

const limiterForgotPasswordByIP = new RateLimiterRedis({
  blockDuration: HOUR_IN_SECONDS,
  duration: DAY_IN_SECONDS,
  keyPrefix: "forgot-password-rate-limits",
  points: MAX_FORGOT_PASSWORD_REQUESTS_PER_DAY,
  storeClient: pubClient,
});

const limiterPublicByIP = new RateLimiterRedis({
  keyPrefix: "public-rate-limits-ip",
  storeClient: pubClient,
  blockDuration: HOUR_IN_SECONDS,
  duration: HOUR_IN_SECONDS,
  points: MAX_PUBLIC_REQUESTS_PER_HOUR,
});

const setHeadersForLimitExceeded = (
  limiterResponse: RateLimiterRes,
  res: FastifyReply,
): void => {
  const retryAfter = Math.round(limiterResponse.msBeforeNext / 1000) || 1;
  const rateLimitRemaining = limiterResponse.remainingPoints;
  const rateLimitReset = new Date(Date.now() + limiterResponse.msBeforeNext);
  res.header("Retry-After", retryAfter);
  res.header("X-RateLimit-Remaining", rateLimitRemaining);
  res.header("X-RateLimit-Reset", rateLimitReset);
};

export async function consumeRegisterLimiter(
  req: FastifyRequest,
  res: FastifyReply,
): Promise<{
  isLimited: boolean;
  limiterResponse?: RateLimiterRes;
}> {
  const ratePointsToConsume = 1;
  const publicIpAddress = req.ip
    .replace("::1", "127.0.0.1")
    .replace("::ffff:127.0.0.1", "127.0.0.1");
  try {
    const limiterResponse = await limiterRegisterByIP.consume(
      publicIpAddress,
      ratePointsToConsume,
    );
    if (limiterResponse.remainingPoints <= 0) {
      setHeadersForLimitExceeded(limiterResponse, res);
      return { isLimited: true, limiterResponse };
    }
    return { isLimited: false, limiterResponse };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      if (error.remainingPoints <= 0) {
        setHeadersForLimitExceeded(error, res);
        return { isLimited: true, limiterResponse: error };
      }
    }
    throw error;
  }
}

export async function consumeForgotPasswordLimiter(
  req: FastifyRequest,
  res: FastifyReply,
): Promise<{
  isLimited: boolean;
  limiterResponse?: RateLimiterRes;
}> {
  const ratePointsToConsume = 1;
  const publicIpAddress = req.ip
    .replace("::1", "127.0.0.1")
    .replace("::ffff:127.0.0.1", "127.0.0.1");
  try {
    const limiterResponse = await limiterForgotPasswordByIP.consume(
      publicIpAddress,
      ratePointsToConsume,
    );
    if (limiterResponse.remainingPoints <= 0) {
      setHeadersForLimitExceeded(limiterResponse, res);
      return { isLimited: true, limiterResponse };
    }
    return { isLimited: false, limiterResponse };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      if (error.remainingPoints <= 0) {
        setHeadersForLimitExceeded(error, res);
        return { isLimited: true, limiterResponse: error };
      }
    }
    throw error;
  }
}

// Login limiter: handles both brute force by IP and consecutive fails by username+IP
export async function consumeLoginLimiter(
  req: FastifyRequest<{ Body: LoginBody }>,
  res: FastifyReply,
): Promise<{
  isLimited: boolean;
  clearFailCounters?: () => Promise<void>;
  incrementFailCounters?: () => Promise<void>;
}> {
  const ratePointsToConsume = 1;
  const publicIpAddress = req.ip
    .replace("::1", "127.0.0.1")
    .replace("::ffff:127.0.0.1", "127.0.0.1");
  const email = req.body.email;
  const fingerprint = req.body.fingerprint;
  const userRatesKey = `${email}_${fingerprint}`;
  try {
    // Get current state for all limiters
    const [resByUserAndFingerprint, resByFingerprint, resByIP] =
      await Promise.all([
        limiterConsecutiveFailsByUsernameAndFingerprint.get(userRatesKey),
        limiterByFingerprint.get(fingerprint),
        limiterSlowBruteByIP.get(publicIpAddress),
      ]);
    // 1. Límite global por IP (ataques masivos)
    if (
      resByIP !== null &&
      resByIP.consumedPoints > MAX_LOGIN_REQUESTS_PER_DAY
    ) {
      setHeadersForLimitExceeded(resByIP, res);
      return { isLimited: true };
    }
    // 2. Límite por fingerprint (ataques de diccionario distribuidos)
    if (
      resByFingerprint !== null &&
      resByFingerprint.consumedPoints > MAX_LOGIN_ATTEMPTS_PER_FINGERPRINT
    ) {
      setHeadersForLimitExceeded(resByFingerprint, res);
      return { isLimited: true };
    }
    // 3. Límite por usuario+fingerprint (ataques dirigidos)
    if (
      resByUserAndFingerprint !== null &&
      resByUserAndFingerprint.consumedPoints > MAX_LOGIN_CONSECUTIVE_REQUESTS
    ) {
      setHeadersForLimitExceeded(resByUserAndFingerprint, res);
      return { isLimited: true };
    }
    // Helper to clear fail counters after successful login
    const clearFailCounters = async (): Promise<void> => {
      await limiterConsecutiveFailsByUsernameAndFingerprint.delete(
        userRatesKey,
      );
    };
    // Helper to increment fail counters after failed login
    const incrementFailCounters = async (): Promise<void> => {
      await Promise.all([
        limiterSlowBruteByIP.consume(publicIpAddress, ratePointsToConsume),
        limiterByFingerprint.consume(fingerprint, ratePointsToConsume),
        limiterConsecutiveFailsByUsernameAndFingerprint.consume(
          userRatesKey,
          ratePointsToConsume,
        ),
      ]);
    };
    return {
      isLimited: false,
      clearFailCounters,
      incrementFailCounters,
    };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      if (error.remainingPoints <= 0) {
        setHeadersForLimitExceeded(error, res);
        return { isLimited: true };
      }
    }
    throw error;
  }
}

export async function consumePublicLimiter(
  ipString: string,
  res: FastifyReply,
): Promise<{
  isLimited: boolean;
  limiterResponse?: RateLimiterRes;
}> {
  const ip = ipString
    .replace("::1", "127.0.0.1")
    .replace("::ffff:127.0.0.1", "127.0.0.1");
  try {
    const limiterResponse = await limiterPublicByIP.consume(ip, 1);
    if (limiterResponse.remainingPoints <= 0) {
      setHeadersForLimitExceeded(limiterResponse, res);
      return { isLimited: true, limiterResponse };
    }
    return { isLimited: false, limiterResponse };
  } catch (error) {
    if (error instanceof RateLimiterRes) {
      if (error.remainingPoints <= 0) {
        setHeadersForLimitExceeded(error, res);
        return { isLimited: true, limiterResponse: error };
      }
    }
    throw error;
  }
}

// export async function consumeResendValidationLimiter(
//   req: FastifyRequest,
//   res: FastifyReply,
// ) {
//   const ip = req.ip
//     .replace("::1", "127.0.0.1")
//     .replace("::ffff:127.0.0.1", "127.0.0.1");
//   try {
//     const limiterResponse = await limiterResendValidationByIP.consume(ip, 1);
//     if (limiterResponse.remainingPoints <= 0) {
//       setHeadersForLimitExceeded(limiterResponse, res);
//       return { isLimited: true, limiterResponse };
//     }
//     return { isLimited: false, limiterResponse };
//   } catch (err: any) {
//     if (err && err.remainingPoints <= 0) {
//       setHeadersForLimitExceeded(err, res);
//       return { isLimited: true, limiterResponse: err };
//     }
//     throw err;
//   }
// }
