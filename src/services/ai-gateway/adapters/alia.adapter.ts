/**
 * ALIA Adapter - BSC ALIA-40B (On-Premise Spanish Sovereign Model)
 *
 * Compatible with vLLM and text-generation-inference (TGI) servers
 * Uses OpenAI-compatible API format
 *
 * Model: BSC-LT/ALIA-40b-instruct
 * Quantized: BSC-LT/ALIA-40b-instruct_Q8_0 (recommended for production)
 *
 * @see https://huggingface.co/BSC-LT/ALIA-40b-instruct
 */

import {
  type AIConfig,
  type AIProviderAdapter,
  type AICompletionRequest,
  type AICompletionResponse,
  AIProvider,
} from "../types.js";

interface OpenAICompatibleResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class ALIAAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    // Default to local vLLM/TGI server
    const baseUrl = this.config.baseUrl ?? "http://localhost:8000";
    // If baseUrl already ends with /v1, don't add it again
    const endpoint = baseUrl.endsWith("/v1")
      ? `${baseUrl}/chat/completions`
      : `${baseUrl}/v1/chat/completions`;

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // API key is optional for local deployments
    if (this.config.apiKey) {
      headers["Authorization"] = `Bearer ${this.config.apiKey}`;
    }

    const timeout = this.config.timeout ?? 120000; // 2 min default for large model
    let response: Response;

    try {
      response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: this.config.model,
          messages: request.messages,
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          max_tokens: request.maxTokens ?? this.config.maxTokens ?? 4096,
          top_p: request.topP ?? this.config.topP ?? 1,
          stream: false,
        }),
        signal: AbortSignal.timeout(timeout),
      });
    } catch (fetchError) {
      // Handle timeout and network errors explicitly
      if (fetchError instanceof Error) {
        if (
          fetchError.name === "TimeoutError" ||
          fetchError.name === "AbortError"
        ) {
          throw new Error(`ALIA request timed out after ${timeout / 1000}s`);
        }
        if (fetchError.message.includes("fetch")) {
          throw new Error(`ALIA network error: ${fetchError.message}`);
        }
      }
      throw new Error(`ALIA fetch error: ${String(fetchError)}`);
    }

    if (!response.ok) {
      const errorText = await response.text();
      let errorMessage: string;

      try {
        const errorJson = JSON.parse(errorText) as {
          error?: { message?: string };
        };
        errorMessage = errorJson.error?.message ?? errorText;
      } catch {
        errorMessage = errorText;
      }

      throw new Error(`ALIA API error: ${response.status} - ${errorMessage}`);
    }

    const data = (await response.json()) as OpenAICompatibleResponse;
    const choice = data.choices[0];

    if (!choice) {
      throw new Error("ALIA API returned no completions");
    }

    return {
      content: choice.message.content,
      model: data.model,
      provider: AIProvider.ALIA,
      usage: {
        promptTokens: data.usage.prompt_tokens,
        completionTokens: data.usage.completion_tokens,
        totalTokens: data.usage.total_tokens,
      },
      finishReason: this.mapFinishReason(choice.finish_reason),
    };
  }

  private mapFinishReason(
    reason: string,
  ): "stop" | "length" | "content_filter" | "error" {
    switch (reason) {
      case "stop":
      case "eos":
        return "stop";
      case "length":
      case "max_tokens":
        return "length";
      case "content_filter":
        return "content_filter";
      default:
        return "stop";
    }
  }

  validateConfig(): boolean {
    // Model is required, baseUrl defaults to localhost:8000
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    return this.config.model !== undefined;
  }
}
