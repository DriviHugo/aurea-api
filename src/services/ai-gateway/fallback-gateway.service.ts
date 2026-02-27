import {
  type AIConfig,
  type AICompletionRequest,
  type AICompletionResponse,
} from "./types.js";
import { AIGatewayService } from "./index.js";
import logger from "../../config/logger.js";

/**
 * FallbackAIGatewayService
 * Usa ALIA como modelo principal y el modelo actual como backup.
 * Si ALIA falla (error de red, status, o respuesta vacía), usa el secundario.
 */
export class FallbackAIGatewayService {
  private aliaGateway: AIGatewayService;
  private fallbackGateway: AIGatewayService | null;
  private fallbackConfig: AIConfig;

  constructor(aliaConfig: AIConfig, fallbackConfig: AIConfig) {
    this.aliaGateway = new AIGatewayService(aliaConfig);
    this.fallbackConfig = fallbackConfig;
    // Solo crear fallback si tiene API key
    this.fallbackGateway =
      fallbackConfig.apiKey && fallbackConfig.apiKey.trim() !== ""
        ? new AIGatewayService(fallbackConfig)
        : null;

    if (!this.fallbackGateway) {
      logger.warn({
        msg: "[FallbackAIGateway] No fallback configured - ALIA is the only provider",
      });
    }
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    let aliaError: Error | null = null;

    // 1. Intenta con ALIA
    try {
      logger.info({ msg: "[FallbackAIGateway] Trying ALIA..." });
      const aliaResult = await this.aliaGateway.complete(request);
      // 2. Comprueba que el resultado es válido (hay texto y no error)
      if (
        aliaResult &&
        aliaResult.content &&
        aliaResult.content.trim() !== "" &&
        aliaResult.finishReason !== "error"
      ) {
        logger.info({
          msg: "[FallbackAIGateway] ALIA succeeded",
          provider: "ALIA",
          model: aliaResult.model,
          tokens: aliaResult.usage,
        });
        return aliaResult;
      }
      // Si el resultado es vacío o error, lanza para fallback
      aliaError = new Error("ALIA result invalid or empty");
    } catch (err) {
      aliaError = err instanceof Error ? err : new Error(String(err));
      logger.warn({
        msg: "[FallbackAIGateway] ALIA failed",
        error: aliaError.message,
      });
    }

    // 3. Si falla ALIA, intenta fallback
    if (this.fallbackGateway) {
      try {
        logger.info({
          msg: "[FallbackAIGateway] Trying fallback provider...",
          provider: this.fallbackConfig.provider,
          model: this.fallbackConfig.model,
        });
        const fallbackResult = await this.fallbackGateway.complete(request);
        logger.info({
          msg: "[FallbackAIGateway] Fallback succeeded",
          provider: this.fallbackConfig.provider,
          model: fallbackResult.model,
          tokens: fallbackResult.usage,
        });
        return fallbackResult;
      } catch (fallbackErr) {
        const fbError =
          fallbackErr instanceof Error
            ? fallbackErr
            : new Error(String(fallbackErr));
        logger.error({
          msg: "[FallbackAIGateway] Fallback also failed",
          error: fbError.message,
        });
        throw new Error(
          `Both AI providers failed. ALIA: ${aliaError?.message}. Fallback: ${fbError.message}`,
        );
      }
    }

    // Sin fallback disponible
    throw new Error(`ALIA failed and no fallback configured: ${aliaError?.message}`);
  }

  async completeSimple(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const response = await this.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
    return response.content;
  }
}
