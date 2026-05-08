/**
 * Production AI Gateway
 *
 * Each role (primary / fallback) is independently routed via its own URL variable:
 *
 *   AI_PRIMARY_GATEWAY_URL  — set → on-prem primary  | empty → ALIA cloud
 *   AI_FALLBACK_GATEWAY_URL — set → on-prem fallback | empty → Anthropic cloud
 *
 * Both URLs must expose an OpenAI-compatible /chat/completions endpoint.
 *
 * Typical setups:
 *   Local/staging:   both empty  → ALIA cloud primary + Anthropic cloud fallback
 *   Production:      both set    → on-prem primary + on-prem fallback (different models/ports)
 *   Mixed:           only one set → one on-prem, the other cloud
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
    const temperature = parseFloat(process.env["AI_TEMPERATURE"] ?? "0.7");

    const primaryUrl = process.env["AI_PRIMARY_GATEWAY_URL"]?.trim();
    const fallbackUrl = process.env["AI_FALLBACK_GATEWAY_URL"]?.trim();

    // Primary: on-prem if URL is set, ALIA cloud otherwise
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
        }
      : {
          provider: AIProvider.ALIA,
          model: process.env["ALIA_MODEL"] ?? "alia-40b-instruct",
          baseUrl:
            process.env["ALIA_BASE_URL"] ??
            "https://api.nextbit256.com/onemillion/llm/v1",
          apiKey: process.env["ALIA_API_KEY"] ?? "",
          temperature,
          maxTokens: 4096,
        };

    // Fallback: on-prem if URL is set, Anthropic cloud otherwise
    const anthropicKey = process.env["ANTHROPIC_API_KEY"] ?? "";
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
        }
      : {
          provider: AIProvider.ANTHROPIC,
          model: envModel.trim() !== "" ? envModel : "claude-sonnet-4-20250514",
          apiKey: anthropicKey,
          temperature,
          maxTokens: 4096,
        };

    logger.info({
      msg: "[ProductionGateway] Initializing gateway",
      primaryMode: primaryUrl ? `on-prem (${primaryUrl})` : "cloud (ALIA)",
      fallbackMode: fallbackUrl
        ? `on-prem (${fallbackUrl})`
        : "cloud (Anthropic)",
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
