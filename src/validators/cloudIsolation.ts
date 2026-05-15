/**
 * Cloud Isolation Validator
 *
 * Ensures that in production (NODE_ENV !== 'development'), the application
 * has zero external cloud dependencies and is running purely on-prem.
 *
 * This validator:
 * 1. Checks environment variables for cloud service keys
 * 2. Validates that on-prem gateway URLs are present and configured
 * 3. Fails fast at startup if cloud providers are detected
 */

/**
 * Cloud service patterns to block in production
 */
const BLOCKED_CLOUD_PATTERNS = {
  // Provider API URLs
  "api.openai.com": "OpenAI (BLOCKED IN PRODUCTION)",
  "api.anthropic.com": "Anthropic Claude (BLOCKED IN PRODUCTION)",
  "generativelanguage.googleapis.com": "Google Gemini (BLOCKED IN PRODUCTION)",
  "nextbit256.com": "ALIA Cloud (BLOCKED IN PRODUCTION)",
  "api.nextbit256.com": "ALIA Cloud (BLOCKED IN PRODUCTION)",

  // Cloud infrastructure
  "supabase.com": "Supabase (BLOCKED IN PRODUCTION)",
  "supabase.co": "Supabase (BLOCKED IN PRODUCTION)",
  "fonts.googleapis.com": "Google Fonts (BLOCKED IN PRODUCTION)",
};

/**
 * Cloud provider environment variable patterns
 */
const BLOCKED_CLOUD_ENV_VARS = [
  {
    pattern: /^ANTHROPIC_API_KEY$/i,
    provider: "Anthropic Claude",
  },
  {
    pattern: /^OPENAI_API_KEY$/i,
    provider: "OpenAI",
  },
  {
    pattern: /^GOOGLE_API_KEY$/i,
    provider: "Google Gemini",
  },
  {
    pattern: /^GEMINI_API_KEY$/i,
    provider: "Google Gemini",
  },
  {
    pattern: /^ALIA_API_KEY$/i,
    provider: "ALIA Cloud",
  },
];

interface ValidationResult {
  isCompliant: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Validate that no cloud URLs are hardcoded in the environment
 */
function validateNoCloudEnvironmentVars(nodeEnv: string): ValidationResult {
  const result: ValidationResult = {
    isCompliant: true,
    errors: [],
    warnings: [],
  };

  // In production, check for cloud API keys in environment
  if (nodeEnv === "production") {
    for (const [envKey, envValue] of Object.entries(process.env)) {
      // Check if this env var is a blocked cloud provider key
      for (const blocked of BLOCKED_CLOUD_ENV_VARS) {
        if (blocked.pattern.test(envKey) && envValue && envValue.trim()) {
          result.isCompliant = false;
          result.errors.push(
            `[CLOUD ISOLATION VIOLATION] Environment variable '${envKey}' is set for ${blocked.provider}. ` +
              `In production, only on-prem AI gateways are allowed. ` +
              `Use AI_PRIMARY_GATEWAY_URL and AI_FALLBACK_GATEWAY_URL instead.`,
          );
        }
      }
    }
  }

  return result;
}

/**
 * Validate that no cloud URLs are in the AI gateway configuration
 */
function validateNoCloudGateways(nodeEnv: string): ValidationResult {
  const result: ValidationResult = {
    isCompliant: true,
    errors: [],
    warnings: [],
  };

  const primaryUrl = process.env["AI_PRIMARY_GATEWAY_URL"] || "";
  const fallbackUrl = process.env["AI_FALLBACK_GATEWAY_URL"] || "";

  // Check for cloud URLs in gateway configuration
  for (const [pattern, description] of Object.entries(BLOCKED_CLOUD_PATTERNS)) {
    if (
      primaryUrl.toLowerCase().includes(pattern.toLowerCase()) ||
      fallbackUrl.toLowerCase().includes(pattern.toLowerCase())
    ) {
      result.isCompliant = false;
      result.errors.push(
        `[CLOUD ISOLATION VIOLATION] Detected ${description} in gateway URL. ` +
          `In production, only on-prem gateways are allowed.`,
      );
    }
  }

  return result;
}

/**
 * Validate that required on-prem gateway URLs are configured in production
 */
function validateOnPremRequirements(nodeEnv: string): ValidationResult {
  const result: ValidationResult = {
    isCompliant: true,
    errors: [],
    warnings: [],
  };

  if (nodeEnv === "production") {
    const primaryUrl = process.env["AI_PRIMARY_GATEWAY_URL"];
    const fallbackUrl = process.env["AI_FALLBACK_GATEWAY_URL"];

    if (!primaryUrl || !primaryUrl.trim()) {
      result.isCompliant = false;
      result.errors.push(
        "[CLOUD ISOLATION ERROR] AI_PRIMARY_GATEWAY_URL is not set. " +
          "In production, on-prem AI gateway URLs are required.",
      );
    }

    if (!fallbackUrl || !fallbackUrl.trim()) {
      result.isCompliant = false;
      result.errors.push(
        "[CLOUD ISOLATION ERROR] AI_FALLBACK_GATEWAY_URL is not set. " +
          "In production, on-prem fallback gateway URLs are required.",
      );
    }
  } else {
    // In development, just warn if no on-prem URLs
    if (
      !process.env["AI_PRIMARY_GATEWAY_URL"] &&
      !process.env["AI_FALLBACK_GATEWAY_URL"]
    ) {
      result.warnings.push(
        "[CLOUD ISOLATION WARNING] No on-prem gateway URLs configured. " +
          "Cloud fallback will be used for local development. " +
          "This is only allowed in NODE_ENV=development.",
      );
    }
  }

  return result;
}

/**
 * Perform comprehensive cloud isolation validation
 * Call this at application startup (in index.ts before starting server)
 */
export function validateCloudIsolation(): void {
  const nodeEnv = process.env["NODE_ENV"] || "development";

  const results: ValidationResult[] = [
    validateNoCloudEnvironmentVars(nodeEnv),
    validateNoCloudGateways(nodeEnv),
    validateOnPremRequirements(nodeEnv),
  ];

  const allErrors = results.flatMap((r) => r.errors);
  const allWarnings = results.flatMap((r) => r.warnings);

  // Log warnings
  for (const warning of allWarnings) {
    console.warn(`⚠️  ${warning}`);
  }

  // Fail if any errors detected
  if (allErrors.length > 0) {
    console.error(
      "❌ CLOUD ISOLATION VALIDATION FAILED\n" +
        "═══════════════════════════════════════════════════════════════════",
    );
    for (const error of allErrors) {
      console.error(`\n${error}`);
    }
    console.error(
      "\n═══════════════════════════════════════════════════════════════════" +
        "\n❌ Cloud providers detected in production configuration.\n" +
        "Please set on-prem gateway URLs and remove cloud API keys.",
    );
    process.exit(1);
  }

  // Success message
  console.log(
    `✅ Cloud Isolation Validation PASSED (NODE_ENV=${nodeEnv})`,
  );
  if (allWarnings.length === 0 && nodeEnv !== "development") {
    console.log(
      "✅ On-prem gateway is properly configured with zero cloud dependencies.",
    );
  }
}

/**
 * Check if a URL is a known cloud service
 * Useful for runtime validation in adapters
 */
export function isCloudUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase();
  return Object.keys(BLOCKED_CLOUD_PATTERNS).some((pattern) =>
    lowerUrl.includes(pattern.toLowerCase()),
  );
}

/**
 * Get list of blocked cloud patterns for logging/documentation
 */
export function getBlockedCloudServices(): typeof BLOCKED_CLOUD_PATTERNS {
  return BLOCKED_CLOUD_PATTERNS;
}
