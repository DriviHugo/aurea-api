/**
 * Azure OpenAI Adapter - Government Cloud (ENS Alto)
 */

import type {
  AIConfig,
  AIProviderAdapter,
  AICompletionRequest,
  AICompletionResponse,
} from "../types.js";

export class AzureOpenAIAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Azure OpenAI format: https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-08-01-preview
    const apiVersion = "2024-08-01-preview";
    const url = `${this.config.baseUrl}/openai/deployments/${this.config.model}/chat/completions?api-version=${apiVersion}`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "api-key": this.config.apiKey!,
      },
      body: JSON.stringify({
        messages: request.messages,
        temperature: request.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
        top_p: request.topP ?? this.config.topP ?? 1,
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        `Azure OpenAI error: ${response.status} - ${error.error?.message || "Unknown error"}`,
      );
    }

    const data = (await response.json()) as {
      choices: Array<{ message: { content: string }; finish_reason: string }>;
      usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
      };
    };
    const choice = data.choices[0];
    if (!choice) {
      throw new Error("No choices returned from Azure OpenAI");
    }

    return {
      content: choice.message.content,
      model: this.config.model,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: choice.finish_reason === "stop" ? "stop" : "error",
    };
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && !!this.config.baseUrl && !!this.config.model;
  }
}
