import {
  type AIConfig,
  type AICompletionRequest,
  type AICompletionResponse,
  AIProvider,
} from "./types.js";
import { AIGatewayService } from "./index.js";

/**
 * FallbackAIGatewayService
 * Usa ALIA como modelo principal y el modelo actual como backup.
 * Si ALIA falla (error de red, status, o respuesta vacía), usa el secundario.
 */
export class FallbackAIGatewayService {
  private aliaGateway: AIGatewayService;
  private fallbackGateway: AIGatewayService;

  constructor(aliaConfig: AIConfig, fallbackConfig: AIConfig) {
    this.aliaGateway = new AIGatewayService(aliaConfig);
    this.fallbackGateway = new AIGatewayService(fallbackConfig);
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // 1. Intenta con ALIA
    try {
      const aliaResult = await this.aliaGateway.complete(request);
      // 2. Comprueba que el resultado es válido (hay texto y no error)
      if (
        aliaResult &&
        aliaResult.content &&
        aliaResult.content.trim() !== "" &&
        aliaResult.finishReason !== "error"
      ) {
        return aliaResult;
      }
      // Si el resultado es vacío o error, lanza para fallback
      throw new Error("ALIA result invalid or empty");
    } catch (err) {
      // 3. Si falla, usa el modelo de backup
      console.warn("ALIA failed, using fallback AI provider", err);
      return this.fallbackGateway.complete(request);
    }
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
