/**
 * Production AI Gateway
 *
 * On-prem is the default behavior.
 * - AI_PRIMARY_GATEWAY_URL is required in non-development environments.
 * - AI_FALLBACK_GATEWAY_URL is optional: if absent, a warning is logged and
 *   the primary is used as both (single-node on-prem deployments).
 * - In development, cloud providers are allowed as a convenience fallback.
 */

import { FallbackAIGatewayService } from "./fallback-gateway.service.js";
import { AIProvider } from "./types.js";
import logger from "../../config/logger.js";

let gateway: FallbackAIGatewayService | null = null;

/**
 * Get the AI gateway singleton.
 */
export function getProductionGateway(): FallbackAIGatewayService {
  if (!gateway) {
    const nodeEnv = process.env["NODE_ENV"] ?? "development";
    const isDevelopment = nodeEnv === "development";
    const temperature = parseFloat(process.env["AI_TEMPERATURE"] ?? "0.7");
    const timeoutMs = parseInt(process.env["AI_TIMEOUT_MS"] ?? "120000", 10);
    const retries = parseInt(process.env["AI_MAX_RETRIES"] ?? "2", 10);
    const timeout = Number.isNaN(timeoutMs) ? 120000 : timeoutMs;
    const retryCount = Number.isNaN(retries) ? 2 : Math.max(retries, 1);

    const primaryUrl = process.env["AI_PRIMARY_GATEWAY_URL"]?.trim();
    const fallbackUrl = process.env["AI_FALLBACK_GATEWAY_URL"]?.trim();

    // In non-development, primary URL is mandatory for on-prem deployments.
    // Exception: if cloud API keys are present (staging/testing), warn and fall through to cloud config.
    if (!isDevelopment && !primaryUrl) {
      const hasCloudKeys =
        process.env["ALIA_API_KEY"]?.trim() !== "" ||
        process.env["AI_CLOUD_FALLBACK_KEY"]?.trim() !== "";
      if (hasCloudKeys) {
        logger.warn({
          msg: "[ProductionGateway] AI_PRIMARY_GATEWAY_URL not set — falling back to cloud API keys (staging mode). Set AI_PRIMARY_GATEWAY_URL for on-prem.",
        });
      } else {
        throw new Error(
          `[ProductionGateway] Missing required on-prem AI gateway var in ${nodeEnv}: AI_PRIMARY_GATEWAY_URL`,
        );
      }
    }

    // In non-development, warn (not throw) if fallback is absent.
    if (!isDevelopment && !fallbackUrl) {
      logger.warn({
        msg: "[ProductionGateway] AI_FALLBACK_GATEWAY_URL not set — running single-node (no AI failover)",
      });
    }

    // Resolve primary config.
    // In development without a primary URL, fall back to cloud ALIA via env vars.
    const primaryConfig = primaryUrl
      ? {
          provider: AIProvider.ALIA,
          model:
            process.env["AI_PRIMARY_MODEL"] ??
            process.env["ALIA_MODEL"] ??
            "BSC-LT/ALIA-40b-instruct_Q8_0",
          baseUrl: primaryUrl,
          apiKey:
            process.env["AI_PRIMARY_API_KEY"] ??
            process.env["ALIA_API_KEY"] ??
            "",
          temperature,
          maxTokens: 4096,
          timeout,
          retries: retryCount,
        }
      : {
          // Development only — requires ALIA_BASE_URL env var
          provider: AIProvider.ALIA,
          model: process.env["ALIA_MODEL"] ?? "alia-40b-instruct",
          baseUrl: process.env["ALIA_BASE_URL"] ?? "",
          apiKey: process.env["ALIA_API_KEY"] ?? "",
          temperature,
          maxTokens: 4096,
          timeout,
          retries: retryCount,
        };

    // Resolve fallback config.
    // If fallbackUrl is set → on-prem secondary (uses AI_FALLBACK_API_KEY).
    // If not set in dev → cloud Mistral (uses AI_CLOUD_FALLBACK_KEY).
    // If not set in prod → mirror primary (single-node, no real failover).
    const envModel = process.env["AI_MODEL"] ?? "";
    const fallbackConfig = fallbackUrl
      ? {
          provider: AIProvider.ALIA,
          model:
            process.env["AI_FALLBACK_MODEL"] ?? "BSC-LT/ALIA-40b-instruct_Q8_0",
          baseUrl: fallbackUrl,
          apiKey: process.env["AI_FALLBACK_API_KEY"] ?? "",
          temperature,
          maxTokens: 4096,
          timeout,
          retries: retryCount,
        }
      : isDevelopment
        ? {
            provider: AIProvider.MISTRAL,
            model: envModel.trim() !== "" ? envModel : "mistral-large-latest",
            apiKey: process.env["AI_CLOUD_FALLBACK_KEY"] ?? "",
            temperature,
            maxTokens: 4096,
            timeout,
            retries: retryCount,
          }
        : primaryConfig; // single-node: fallback mirrors primary

    logger.info({
      msg: "[ProductionGateway] Initializing gateway",
      environment: nodeEnv,
      primaryMode: primaryUrl ? `on-prem (${primaryUrl})` : "cloud/dev (ALIA)",
      fallbackMode: fallbackUrl
        ? `on-prem (${fallbackUrl})`
        : isDevelopment
          ? "cloud/dev (Mistral)"
          : "none (single-node)",
    });

    gateway = new FallbackAIGatewayService(primaryConfig, fallbackConfig);
  }

  return gateway;
}

/**
 * Reset the gateway (useful for testing)
 */
export function resetProductionGateway(): void {
  gateway = null;
}
