/**
 * Google Gemini Adapter - Gemini 2.0 Flash
 */

import type {
  AIConfig,
  AIProviderAdapter,
  AICompletionRequest,
  AICompletionResponse,
  AIMessage,
} from "../types.js";

export class GeminiAdapter implements AIProviderAdapter {
  constructor(private config: AIConfig) {}

  async complete(request: AICompletionRequest): Promise<AICompletionResponse> {
    const apiKey = this.config.apiKey;
    const model = this.config.model || "gemini-2.0-flash-exp";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Convert messages to Gemini format (system + user messages)
    const systemInstruction = request.messages.find(
      (m: AIMessage) => m.role === "system",
    );
    const contents = request.messages
      .filter((m: AIMessage) => m.role !== "system")
      .map((m: AIMessage) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      }));

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: systemInstruction
          ? { parts: [{ text: systemInstruction.content }] }
          : undefined,
        contents,
        generationConfig: {
          temperature: request.temperature ?? this.config.temperature ?? 0.7,
          maxOutputTokens: request.maxTokens ?? this.config.maxTokens ?? 8192,
          topP: request.topP ?? this.config.topP ?? 0.95,
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        `Gemini API error: ${response.status} - ${error.error?.message || "Unknown error"}`,
      );
    }

    const data = (await response.json()) as {
      candidates: Array<{
        content: { parts: Array<{ text: string }> };
        finishReason: string;
      }>;
      usageMetadata?: {
        promptTokenCount?: number;
        candidatesTokenCount?: number;
        totalTokenCount?: number;
      };
    };
    const candidate = data.candidates[0];
    if (!candidate?.content.parts[0]) {
      throw new Error("No candidates returned from Gemini");
    }
    const content = candidate.content.parts[0].text;

    return {
      content,
      model: this.config.model,
      usage: {
        promptTokens: data.usageMetadata?.promptTokenCount || 0,
        completionTokens: data.usageMetadata?.candidatesTokenCount || 0,
        totalTokens: data.usageMetadata?.totalTokenCount || 0,
      },
      finishReason: candidate.finishReason === "STOP" ? "stop" : "error",
    };
  }

  validateConfig(): boolean {
    return !!this.config.apiKey && !!this.config.model;
  }
}
