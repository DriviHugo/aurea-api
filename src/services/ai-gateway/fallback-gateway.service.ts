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
 * Supports swapping the order so the fallback becomes primary.
 */
export class FallbackAIGatewayService {
  private aliaGateway: AIGatewayService;
  private fallbackGateway: AIGatewayService | null;
  private fallbackConfig: AIConfig;
  private aliaConfig: AIConfig;
  private _swapped = false;

  constructor(aliaConfig: AIConfig, fallbackConfig: AIConfig) {
    this.aliaConfig = aliaConfig;
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

  /** Swap the primary and fallback providers */
  swap(): void {
    this._swapped = !this._swapped;
    logger.info({
      msg: "[FallbackAIGateway] Provider order swapped",
      swapped: this._swapped,
      primary: this._swapped
        ? this.fallbackConfig.provider
        : this.aliaConfig.provider,
      fallback: this._swapped
        ? this.aliaConfig.provider
        : this.fallbackConfig.provider,
    });
  }

  /** Whether the provider order is currently swapped */
  get isSwapped(): boolean {
    return this._swapped;
  }

  /** Get current provider configuration info */
  getProviderInfo(): {
    primary: { provider: string; model: string };
    fallback: { provider: string; model: string } | null;
    swapped: boolean;
  } {
    const alia = {
      provider: this.aliaConfig.provider,
      model: this.aliaConfig.model,
    };
    const fb = this.fallbackGateway
      ? {
          provider: this.fallbackConfig.provider,
          model: this.fallbackConfig.model,
        }
      : null;

    return {
      primary: this._swapped && fb ? fb : alia,
      fallback: this._swapped ? alia : fb,
      swapped: this._swapped,
    };
  }

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Determine primary and secondary based on swap state
    const primaryGateway = this._swapped && this.fallbackGateway
      ? this.fallbackGateway
      : this.aliaGateway;
    const secondaryGateway = this._swapped
      ? this.aliaGateway
      : this.fallbackGateway;
    const primaryLabel = this._swapped
      ? this.fallbackConfig.provider
      : "ALIA";
    const secondaryLabel = this._swapped
      ? "ALIA"
      : this.fallbackConfig.provider;

    let primaryError: Error | null = null;

    // DEV: Force ALIA failure for testing fallback
    const forceAliaFail = process.env["FORCE_ALIA_FAIL"] === "true";
    if (forceAliaFail && !this._swapped) {
      logger.warn({
        msg: "[FallbackAIGateway] FORCE_ALIA_FAIL enabled - skipping ALIA",
      });
      primaryError = new Error("ALIA forced failure for testing");
    }

    // 1. Try primary provider (skip if forced fail)
    if (primaryError == null) {
      try {
        logger.info({
          msg: `[FallbackAIGateway] Trying primary: ${primaryLabel}...`,
        });
        const primaryResult = await primaryGateway.complete(request);
        // 2. Check if result is valid (has text and no error)
        if (
          primaryResult &&
          primaryResult.content &&
          primaryResult.content.trim() !== "" &&
          primaryResult.finishReason !== "error"
        ) {
          logger.info({
            msg: `[FallbackAIGateway] ${primaryLabel} succeeded`,
            provider: primaryLabel,
            model: primaryResult.model,
            tokens: primaryResult.usage,
          });
          return primaryResult;
        }
        // Empty or error result — fall through to secondary
        primaryError = new Error(`${primaryLabel} result invalid or empty`);
      } catch (err) {
        primaryError = err instanceof Error ? err : new Error(String(err));
        logger.warn({
          msg: `[FallbackAIGateway] ${primaryLabel} failed`,
          error: primaryError.message,
        });
      }
    }

    // 3. If primary fails, try secondary
    if (secondaryGateway) {
      logger.info({
        msg: `[FallbackAIGateway] ${primaryLabel} failed, attempting ${secondaryLabel}`,
        primaryError: primaryError?.message,
        fallbackProvider: secondaryLabel,
      });
      try {
        logger.info({
          msg: `[FallbackAIGateway] Trying ${secondaryLabel}...`,
        });
        const secondaryResult = await secondaryGateway.complete(request);
        logger.info({
          msg: `[FallbackAIGateway] ${secondaryLabel} succeeded`,
          provider: secondaryLabel,
          model: secondaryResult.model,
          tokens: secondaryResult.usage,
        });
        return secondaryResult;
      } catch (fallbackErr) {
        const fbError =
          fallbackErr instanceof Error
            ? fallbackErr
            : new Error(String(fallbackErr));
        logger.error({
          msg: "[FallbackAIGateway] Both providers failed",
          primaryError: primaryError?.message,
          secondaryError: fbError.message,
        });
        throw new Error(
          `Both AI providers failed. ${primaryLabel}: ${primaryError?.message}. ${secondaryLabel}: ${fbError.message}`,
        );
      }
    }

    // No secondary available
    throw new Error(
      `${primaryLabel} failed and no fallback configured: ${primaryError?.message}`,
    );
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

  /**
   * Complete with full metadata (provider, model, tokens, etc.)
   * Use this when you need to track which AI provider was used
   */
  async completeWithMeta(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<AICompletionResponse> {
    return this.complete({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  }
}
