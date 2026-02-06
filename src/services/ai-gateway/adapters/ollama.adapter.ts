/**
 * Ollama Adapter - Local LLM (Llama 3.3 70B, DeepSeek)
 */

import type {
  AIConfig,
  AIProviderAdapter,
  AICompletionRequest,
  AICompletionResponse,
} from "../types.js";

export class OllamaAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const baseUrl = this.config.baseUrl || "http://localhost:11434";

    const response = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.config.model,
        messages: request.messages,
        options: {
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          num_predict: request.maxTokens ?? this.config.maxTokens ?? 4096,
          top_p: request.topP ?? this.config.topP ?? 1,
        },
        stream: false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Ollama API error: ${response.status} - ${error}`);
    }

    const data = (await response.json()) as {
      message: { content: string };
      prompt_eval_count?: number;
      eval_count?: number;
      done: boolean;
    };

    return {
      content: data.message.content,
      model: this.config.model,
      usage: {
        promptTokens: data.prompt_eval_count || 0,
        completionTokens: data.eval_count || 0,
        totalTokens: (data.prompt_eval_count || 0) + (data.eval_count || 0),
      },
      finishReason: data.done ? "stop" : "error",
    };
  }

  validateConfig(): boolean {
    return !!this.config.model;
  }
}
