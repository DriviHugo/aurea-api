import jwt from "jsonwebtoken";
import { Errors } from "../errors/appErrorFactory.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"]!;
// Default: 30 minutes. Override with ACCESS_TOKEN_EXPIRATION env var (e.g. "15m", "1h").
const ACCESS_TOKEN_EXPIRATION = process.env["ACCESS_TOKEN_EXPIRATION"] ?? "30m";
export const ACCESS_TOKEN_EXPIRATION_IN_SECONDS = parseDurationToSeconds(
  ACCESS_TOKEN_EXPIRATION,
);

const REFRESH_TOKEN_SECRET = process.env["REFRESH_TOKEN_SECRET"]!;
const REFRESH_TOKEN_EXPIRATION = "30d";
export const REFRESH_TOKEN_EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 30;

const EMAIL_VALIDATION_SECRET = process.env["EMAIL_VALIDATION_SECRET"]!;
const EMAIL_VALIDATION_EXPIRATION = "1h";

/**
 * Parse a simple duration string (e.g. "30m", "8h", "1d") into seconds.
 * Falls back to 1800 (30 minutes) for unrecognised formats.
 */
function parseDurationToSeconds(duration: string): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return 1800;
  const value = parseInt(match[1]!, 10);
  const unit = match[2] ?? "";
  if (unit === "s") return value;
  if (unit === "m") return value * 60;
  if (unit === "h") return value * 3600;
  if (unit === "d") return value * 86400;
  return 1800;
}

export function signAccessToken({
  jti,
  sub,
}: {
  jti: string;
  sub: string;
}): string {
  return jwt.sign({ jti, sub }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION_IN_SECONDS,
  });
}

export function verifyAccessToken(token: string): { jti: string; sub: string } {
  try {
    return jwt.verify(token, ACCESS_TOKEN_SECRET) as {
      jti: string;
      sub: string;
    };
  } catch {
    throw new Errors.unauthorizedToken();
  }
}

export function signRefreshToken({
  jti,
  sub,
}: {
  jti: string;
  sub: string;
}): string {
  return jwt.sign({ jti, sub }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });
}

export function verifyRefreshToken(token: string): {
  jti: string;
  sub: string;
} {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as {
      jti: string;
      sub: string;
    };
  } catch {
    throw new Errors.unauthorizedToken();
  }
}

export function signEmailValidation({ email }: { email: string }): string {
  return jwt.sign(
    { sub: email, type: "email_validation" },
    EMAIL_VALIDATION_SECRET,
    {
      expiresIn: EMAIL_VALIDATION_EXPIRATION,
    },
  );
}

export function verifyEmailValidation(token: string): string | null {
  try {
    const data = jwt.verify(token, EMAIL_VALIDATION_SECRET) as {
      sub: string;
      type: string;
    };
    if (data.type !== "email_validation" || !data.sub) {
      return null;
    }

    return data.sub;
  } catch {
    return null;
  }
}
