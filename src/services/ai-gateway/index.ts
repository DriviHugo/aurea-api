/**
 * AI Gateway Service - Production Provider-Agnostic AI
 * Unified interface for AUREA AI functions
 */

import type {
  AIConfig,
  AIProviderAdapter,
  AICompletionRequest,
  AICompletionResponse,
} from "./types.js";
import { AIProvider } from "./types.js";
import { OllamaAdapter } from "./adapters/ollama.adapter.js";
import { OpenAIAdapter } from "./adapters/openai.adapter.js";
import { AzureOpenAIAdapter } from "./adapters/azure-openai.adapter.js";
import { GeminiAdapter } from "./adapters/gemini.adapter.js";
import { AnthropicAdapter } from "./adapters/anthropic.adapter.js";

export class AIGatewayService {
  private adapter: AIProviderAdapter;
  private config: AIConfig;

  constructor(config: AIConfig) {
    this.config = config;
    this.adapter = this.createAdapter(config);

    if (!this.adapter.validateConfig()) {
      throw new Error(
        `Invalid AI configuration for provider: ${config.provider}`,
      );
    }
  }

  private createAdapter(config: AIConfig): AIProviderAdapter {
    switch (config.provider) {
      case AIProvider.OLLAMA:
        return new OllamaAdapter(config);
      case AIProvider.OPENAI:
        return new OpenAIAdapter(config);
      case AIProvider.AZURE_OPENAI:
        return new AzureOpenAIAdapter(config);
      case AIProvider.GEMINI:
        return new GeminiAdapter(config);
      case AIProvider.ANTHROPIC:
        return new AnthropicAdapter(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }

  /**
   * Complete AI request with retry logic and logging
   */
  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();
        const response = await this.adapter.complete(request);
        const duration = Date.now() - startTime;

        // Log successful completion (integrate with Winston)
        console.log({
          event: "ai_completion",
          provider: this.config.provider,
          model: this.config.model,
          duration,
          tokens: response.usage.totalTokens,
          attempt,
        });

        return response;
      } catch (error) {
        lastError = error as Error;

        console.error({
          event: "ai_completion_error",
          provider: this.config.provider,
          model: this.config.model,
          attempt,
          error: lastError.message,
        });

        if (attempt < maxRetries) {
          // Exponential backoff: 1s, 2s, 4s
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000),
          );
        }
      }
    }

    throw new Error(
      `AI completion failed after ${maxRetries} attempts: ${lastError?.message}`,
    );
  }

  /**
   * Helper for single-message completions (common pattern)
   */
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

/**
 * Factory function - loads config from environment
 */
export function createAIGateway(): AIGatewayService {
  const provider = (process.env["AI_PROVIDER"] || "ollama") as AIProvider;

  const config: AIConfig = {
    provider,
    model: process.env["AI_MODEL"] || getDefaultModel(provider),
    temperature: parseFloat(process.env["AI_TEMPERATURE"] || "0.7"),
    maxTokens: parseInt(process.env["AI_MAX_TOKENS"] || "4096"),
  };

  // Add optional properties only if they exist
  if (process.env["AI_API_KEY"]) {
    config.apiKey = process.env["AI_API_KEY"];
  }
  if (process.env["AI_BASE_URL"]) {
    config.baseUrl = process.env["AI_BASE_URL"];
  }

  return new AIGatewayService(config);
}

function getDefaultModel(provider: AIProvider): string {
  const defaults: Record<AIProvider, string> = {
    [AIProvider.OLLAMA]: "llama3.3:70b",
    [AIProvider.OPENAI]: "gpt-4-turbo-preview",
    [AIProvider.AZURE_OPENAI]: "gpt-4", // Deployment name
    [AIProvider.GEMINI]: "gemini-2.0-flash-exp",
    [AIProvider.ANTHROPIC]: "claude-3-5-sonnet-20241022",
    [AIProvider.DEEPSEEK]: "deepseek-chat",
  };
  return defaults[provider]!;
}

// Export types and enums
export * from "./types.js";
