/**
 * AI Gateway Service - Production Provider-Agnostic AI
 * Unified interface for AUREA AI functions
 */

import {
  type AIConfig,
  type AIProviderAdapter,
  type AICompletionRequest,
  type AICompletionResponse,
  AIProvider,
} from "./types.js";
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

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const maxRetries = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const response = await this.adapter.complete(request);
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
          await new Promise((resolve) =>
            setTimeout(resolve, Math.pow(2, attempt - 1) * 1000),
          );
        }
      }
    }

    throw new Error(
      `AI completion failed after ${maxRetries} attempts: ${lastError?.message ?? "Unknown error"}`,
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
      case AIProvider.DEEPSEEK:
        return new OllamaAdapter(config);
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`);
    }
  }
}

/**
 * Factory function - loads config from environment
 */
export function createAIGateway(): AIGatewayService {
  const provider = (process.env["AI_PROVIDER"] ?? "ollama") as AIProvider;
  const aiApiKey = process.env["AI_API_KEY"];
  const aiBaseUrl = process.env["AI_BASE_URL"];

  const config: AIConfig = {
    provider,
    model: process.env["AI_MODEL"] ?? getDefaultModel(provider),
    temperature: parseFloat(process.env["AI_TEMPERATURE"] ?? "0.7"),
    maxTokens: parseInt(process.env["AI_MAX_TOKENS"] ?? "4096", 10),
    ...(aiApiKey !== undefined && aiApiKey !== "" && { apiKey: aiApiKey }),
    ...(aiBaseUrl !== undefined && aiBaseUrl !== "" && { baseUrl: aiBaseUrl }),
  };

  return new AIGatewayService(config);
}

function getDefaultModel(provider: AIProvider): string {
  switch (provider) {
    case AIProvider.OLLAMA:
      return "llama3.3:70b";
    case AIProvider.OPENAI:
      return "gpt-4-turbo-preview";
    case AIProvider.AZURE_OPENAI:
      return "gpt-4";
    case AIProvider.GEMINI:
      return "gemini-2.0-flash-exp";
    case AIProvider.ANTHROPIC:
      return "claude-3-5-sonnet-20241022";
    case AIProvider.DEEPSEEK:
      return "deepseek-chat";
  }
}

// Export types and enums
export * from "./types.js";
