/**
 * Base AI Migrator - Supports Claude Sonnet 4.5 + Gemini 3
 * Used for MIGRATION CODE GENERATION (not production AI)
 */

import Anthropic from "@anthropic-ai/sdk";

export type MigrationAIProvider = "anthropic" | "gemini";

export interface MigrationAIConfig {
  provider: MigrationAIProvider;
  apiKey: string;
  model?: string;
}

export abstract class BaseMigrator {
  protected provider: MigrationAIProvider;
  protected apiKey: string;
  protected model: string;

  constructor(config: MigrationAIConfig) {
    this.provider = config.provider;
    this.apiKey = config.apiKey;
    this.model = config.model || this.getDefaultModel();
  }

  private getDefaultModel(): string {
    return this.provider === "anthropic"
      ? "claude-sonnet-4-20250514" // Claude Sonnet 4.5
      : "gemini-2.0-flash-exp";
  }

  protected async generateWithClaude(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const anthropic = new Anthropic({ apiKey: this.apiKey });

    const message = await anthropic.messages.create({
      model: this.model,
      max_tokens: 16000,
      temperature: 0.3, // Lower for code generation
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const content = message.content[0];
    if (content.type !== "text") {
      throw new Error("Unexpected response type from Claude");
    }

    return content.text;
  }

  protected async generateWithGemini(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: userPrompt }] }],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!response.ok) {
      const error = (await response.json()) as { error?: { message?: string } };
      throw new Error(
        `Gemini API error: ${response.status} - ${error.error?.message}`,
      );
    }

    const data = (await response.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    if (!data.candidates[0]?.content.parts[0]) {
      throw new Error("Invalid response from Gemini");
    }
    return data.candidates[0].content.parts[0].text;
  }

  protected async generate(
    systemPrompt: string,
    userPrompt: string,
  ): Promise<string> {
    console.log(`🤖 Generating with ${this.provider} (${this.model})...`);

    if (this.provider === "anthropic") {
      return this.generateWithClaude(systemPrompt, userPrompt);
    } else {
      return this.generateWithGemini(systemPrompt, userPrompt);
    }
  }

  protected cleanMarkdownWrapper(content: string): string {
    // Remove ```prisma, ```typescript, etc. wrappers
    return content
      .replace(/^```[\w]*\n/gm, "")
      .replace(/\n```$/gm, "")
      .trim();
  }

  public static loadConfig(): MigrationAIConfig {
    const provider = (process.env["MIGRATION_AI_PROVIDER"] ||
      "anthropic") as MigrationAIProvider;
    const apiKey =
      provider === "anthropic"
        ? process.env["ANTHROPIC_API_KEY"]
        : process.env["GEMINI_API_KEY"];

    if (!apiKey) {
      throw new Error(
        `Missing API key: ${provider === "anthropic" ? "ANTHROPIC_API_KEY" : "GEMINI_API_KEY"}`,
      );
    }

    return { provider, apiKey };
  }
}
