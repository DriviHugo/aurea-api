import jwt from "jsonwebtoken";
import { Errors } from "../errors/appErrorFactory.js";

const ACCESS_TOKEN_SECRET = process.env["ACCESS_TOKEN_SECRET"]!;
const ACCESS_TOKEN_EXPIRATION = "8h"; // 8 hours for development
export const ACCESS_TOKEN_EXPIRATION_IN_SECONDS = 60 * 60 * 8; // 8 hours

const REFRESH_TOKEN_SECRET = process.env["REFRESH_TOKEN_SECRET"]!;
const REFRESH_TOKEN_EXPIRATION = "30d"; // 30 days
export const REFRESH_TOKEN_EXPIRATION_IN_SECONDS = 60 * 60 * 24 * 30; // 30 days

const EMAIL_VALIDATION_SECRET = process.env["EMAIL_VALIDATION_SECRET"]!;
const EMAIL_VALIDATION_EXPIRATION = "1h"; // 1 hour

export function signAccessToken({
  jti,
  sub,
}: {
  jti: string;
  sub: string;
}): string {
  return jwt.sign({ jti, sub }, ACCESS_TOKEN_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRATION,
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

export function signRefreshToken(jti: string): string {
  return jwt.sign({ jti }, REFRESH_TOKEN_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRATION,
  });
}

export function verifyRefreshToken(token: string): { jti: string } {
  try {
    return jwt.verify(token, REFRESH_TOKEN_SECRET) as { jti: string };
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
