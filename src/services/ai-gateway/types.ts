/**
 * AI Gateway - Production AI Service Types
 * Provider-agnostic interface for AUREA AI functions
 */

export enum AIProvider {
  OPENAI = "openai",
  AZURE_OPENAI = "azure-openai",
  ANTHROPIC = "anthropic",
  GEMINI = "gemini",
  OLLAMA = "ollama",
  DEEPSEEK = "deepseek",
  ALIA = "alia", // BSC ALIA-40B - Spanish sovereign model (on-premise)
}

export interface AIConfig {
  provider: AIProvider;
  apiKey?: string;
  baseUrl?: string; // For Azure/Ollama custom endpoints
  model: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number;
}

export interface AIMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AICompletionRequest {
  messages: AIMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  stream?: boolean;
}

export interface AICompletionResponse {
  content: string;
  model: string;
  provider: AIProvider; // Which AI provider generated this response
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  finishReason: "stop" | "length" | "content_filter" | "error";
}

export interface AIProviderAdapter {
  complete(request: AICompletionRequest): Promise<AICompletionResponse>;
  validateConfig(): boolean;
}
