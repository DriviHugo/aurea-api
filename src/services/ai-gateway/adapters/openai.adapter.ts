/**
 * OpenAI Adapter - GPT-4 Turbo
 */

import type {
  AIConfig,
  AIProviderAdapter,
  AICompletionRequest,
  AICompletionResponse,
} from "../types.js";
import { AIProvider } from "../types.js";

export class OpenAIAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
        top_p: request.topP ?? this.config.topP ?? 1,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        `OpenAI API error: ${response.status} - ${error.error?.message ?? "Unknown error"}`,
      );
    }

    const data = (await response.json()) as {
      model: string;
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    const choice = data.choices[0];
    if (!choice) {
      throw new Error("No choices returned from OpenAI");
    }

    return {
      content: choice.message.content,
      model: data.model,
      provider: AIProvider.OPENAI,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: choice.finish_reason === "stop" ? "stop" : "error",
    };
  }

  validateConfig(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.config.apiKey !== undefined && this.config.model !== undefined;
  }
}
