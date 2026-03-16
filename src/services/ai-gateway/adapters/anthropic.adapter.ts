/**
 * Anthropic Adapter - Claude Sonnet 3.5/4
 */

import {
  type AIConfig,
  type AIProviderAdapter,
  type AICompletionRequest,
  type AICompletionResponse,
  type AIMessage,
  AIProvider,
} from "../types.js";

export class AnthropicAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Separate system message from conversation
    const systemMessage = request.messages.find(
      (m: AIMessage) => m.role === "system",
    );
    const messages = request.messages.filter(
      (m: AIMessage) => m.role !== "system",
    );

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": this.config.apiKey!,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: this.config.model,
        system: systemMessage?.content,
        messages,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 8192,
        top_p: request.topP ?? this.config.topP ?? 1,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        `Anthropic API error: ${response.status} - ${error.error?.message ?? "Unknown error"}`,
      );
    }

    const data = (await response.json()) as {
      content: Array<{ text: string; type: string }>;
      model: string;
      stop_reason: string;
      usage: { input_tokens: number; output_tokens: number };
    };

    if (!data.content[0]) {
      throw new Error("No content returned from Anthropic");
    }

    return {
      content: data.content[0].text,
      model: data.model,
      provider: AIProvider.ANTHROPIC,
      usage: {
        promptTokens: data.usage.input_tokens,
        completionTokens: data.usage.output_tokens,
        totalTokens: data.usage.input_tokens + data.usage.output_tokens,
      },
      finishReason: data.stop_reason === "end_turn" ? "stop" : "error",
    };
  }

  validateConfig(): boolean {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.config.apiKey !== undefined && this.config.model !== undefined;
  }
}
