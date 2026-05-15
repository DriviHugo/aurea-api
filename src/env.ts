import dotenv from "dotenv";

dotenv.config();

/**
 * Environment variable validation
 * Fail fast on missing required vars before any routes are initialized
 */
const REQUIRED_VARS = [
  "DATABASE_URL",
  "ACCESS_TOKEN_SECRET",
  "REFRESH_TOKEN_SECRET",
  "COOKIE_SECRET",
  "FRONTEND_BASE_URL",
  "REDIS_HOST",
  "MINIO_ENDPOINT",
  "MINIO_ACCESS_KEY",
  "MINIO_SECRET_KEY",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]?.trim());
if (missing.length > 0) {
  console.error(
    `[Startup] Missing required environment variables: ${missing.join(", ")}`,
  );
  process.exit(1);
}

/**
 * Feature flags — control optional/dangerous features
 */
export const FEATURE_FLAGS = {
  // SSO: auto-enabled if OIDC_ISSUER_URL is configured
  ssoEnabled: (process.env["OIDC_ISSUER_URL"] ?? "").trim() !== "",
  // Local email/password registration: disabled by default in production
  localAuthRegisterEnabled: process.env["LOCAL_AUTH_ENABLED"] === "true",
  // Debug routes (testcase, aiprovider, repair): disabled by default in production
  debugRoutesEnabled: process.env["NODE_ENV"] !== "production",
};
