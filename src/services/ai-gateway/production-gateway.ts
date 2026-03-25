/**
 * Production AI Gateway - ALIA-first with Anthropic fallback
 *
 * Single source of truth for AI gateway configuration across all endpoints.
 * Uses ALIA (BSC sovereign Spanish model) as primary provider,
 * with Anthropic Claude as fallback for reliability.
 */

import { FallbackAIGatewayService } from "./fallback-gateway.service.js";
import { AIProvider } from "./types.js";
import logger from "../../config/logger.js";

let gateway: FallbackAIGatewayService | null = null;

/**
 * Get the production AI gateway with ALIA + Anthropic fallback
 * This is a singleton - same instance is shared across all requests
 */
export function getProductionGateway(): FallbackAIGatewayService {
  if (!gateway) {
    const temperature = parseFloat(process.env["AI_TEMPERATURE"] ?? "0.7");

    // ALIA config (primary) - NextBit256 sovereign AI
    const aliaConfig = {
      provider: AIProvider.ALIA,
      model: process.env["ALIA_MODEL"] ?? "alia-40b-instruct",
      baseUrl:
        process.env["ALIA_BASE_URL"] ??
        "https://api.nextbit256.com/onemillion/llm/v1",
      apiKey: process.env["ALIA_API_KEY"] ?? "",
      temperature,
      maxTokens: 4096,
    };

    // Fallback config (Anthropic Claude)
    // Uses ANTHROPIC_API_KEY or AI_API_KEY from environment
    const envAnthropicKey = process.env["ANTHROPIC_API_KEY"] ?? "";
    const envAiKey = process.env["AI_API_KEY"] ?? "";
    const anthropicKey =
      envAnthropicKey.trim() !== ""
        ? envAnthropicKey
        : envAiKey.trim() !== ""
          ? envAiKey
          : "";

    const envModel = process.env["AI_MODEL"] ?? "";
    const fallbackConfig = {
      provider: AIProvider.ANTHROPIC,
      model: envModel.trim() !== "" ? envModel : "claude-sonnet-4-20250514",
      apiKey: anthropicKey,
      temperature,
      maxTokens: 4096,
    };

    logger.info({
      msg: "[ProductionGateway] Initializing ALIA + Anthropic fallback gateway",
      aliaModel: aliaConfig.model,
      fallbackConfigured: anthropicKey !== "",
      fallbackModel: fallbackConfig.model,
    });

    gateway = new FallbackAIGatewayService(aliaConfig, fallbackConfig);
  }

  return gateway;
}

/**
 * Reset the gateway (useful for testing)
 */
export function resetProductionGateway(): void {
  gateway = null;
}
