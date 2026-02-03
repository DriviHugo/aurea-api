/**
 * AI Function Migrator - AI-Assisted Script
 * Converts Supabase Edge Functions (Deno) to Fastify routes (Node.js)
 */

import * as fs from "fs";
import * as path from "path";
import { BaseMigrator, type MigrationAIConfig } from "./base-migrator.js";
import type { ProjectInspection } from "../inspectors/project-inspector.js";

export interface FunctionMigrationOptions {
  inspectionPath?: string;
  sourceFunctionsDir?: string;
  outputDir?: string;
  aiProvider?: "ollama" | "azure" | "gemini";
}

export class FunctionMigrator extends BaseMigrator {
  constructor(config: MigrationAIConfig) {
    super(config);
  }

  async migrate(options: FunctionMigrationOptions = {}): Promise<void> {
    const {
      inspectionPath = "migration/inspection.json",
      sourceFunctionsDir = "../aurea-1mb/supabase/functions",
      outputDir = "src/routes/ai-functions",
      aiProvider = "ollama",
    } = options;

    console.log("📖 Reading inspection data...");
    const inspection: ProjectInspection = JSON.parse(
      fs.readFileSync(inspectionPath, "utf-8"),
    );

    if (!inspection.edgeFunctions || inspection.edgeFunctions.length === 0) {
      console.log("ℹ️  No Edge Functions found to migrate");
      return;
    }

    console.log(
      `📝 Found ${inspection.edgeFunctions.length} Edge Functions to migrate`,
    );

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const func of inspection.edgeFunctions) {
      console.log(`\n🤖 Migrating: ${func.name}`);

      const functionPath = path.join(sourceFunctionsDir, func.name, "index.ts");
      if (!fs.existsSync(functionPath)) {
        console.warn(`⚠️  Function file not found: ${functionPath}`);
        continue;
      }

      const denoCode = fs.readFileSync(functionPath, "utf-8");

      const systemPrompt = this.buildFunctionPrompt(aiProvider);
      const userPrompt = this.buildUserPrompt(
        func.name,
        denoCode,
        func.usesAI,
        aiProvider,
      );

      const fastifyCode = await super.generate(systemPrompt, userPrompt);
      const cleanedCode = super.cleanMarkdownWrapper(fastifyCode);

      // Save to file
      const outputPath = path.join(outputDir, `${func.name}.routes.ts`);
      fs.writeFileSync(outputPath, cleanedCode, "utf-8");
      console.log(`✅ Migrated: ${outputPath}`);
    }

    console.log("\n✅ Function migration complete!");
    console.log(`📁 Routes saved to: ${outputDir}`);
  }

  private buildFunctionPrompt(aiProvider: string): string {
    return `You are an expert in migrating Supabase Edge Functions (Deno runtime) to Fastify routes (Node.js).

**Key conversions:**
1. **Deno.serve()** → Fastify route handlers
2. **Deno.env.get()** → \`process.env\`
3. **Headers** → Fastify request/reply objects
4. **Supabase Client** → Prisma Client
5. **AI calls** → AI Gateway service (provider-agnostic)

**AI Gateway Integration:**
\`\`\`typescript
import { createAIGateway } from '../../services/ai-gateway';

const ai = createAIGateway(); // Reads AI_PROVIDER from .env

const response = await ai.complete({
  messages: [
    { role: 'system', content: 'System prompt here...' },
    { role: 'user', content: userInput },
  ],
  temperature: 0.7,
  maxTokens: 4096,
});

const result = response.content;
\`\`\`

**Current AI Provider:** ${aiProvider}
- Configuration comes from .env (AI_PROVIDER, AI_MODEL, AI_API_KEY)
- No hardcoded provider logic in routes
- AI Gateway handles retries and logging automatically

**Expected Output:**
- Complete Fastify route file (no placeholders)
- TypeScript with proper types
- Error handling (try/catch with 500 responses)
- Authentication if original function used Supabase auth
- Validation schemas for request body
- Swagger/OpenAPI decorators`;
  }

  private buildUserPrompt(
    funcName: string,
    denoCode: string,
    usesAI: boolean,
    aiProvider: string,
  ): string {
    return `Convert this Supabase Edge Function to a Fastify route:

**Function Name:** ${funcName}
**Uses AI:** ${usesAI ? "Yes" : "No"}
${usesAI ? `**AI Provider (Production):** ${aiProvider} (configured via AI_PROVIDER env)` : ""}

**Original Deno Code:**
\`\`\`typescript
${denoCode}
\`\`\`

**Requirements:**
1. Convert to Fastify plugin with proper TypeScript types
2. Replace Supabase Client calls with Prisma Client
${usesAI ? "3. Replace direct AI API calls with AI Gateway service" : ""}
${usesAI ? "4. Use createAIGateway() - it reads provider from .env" : ""}
5. Preserve business logic (prompts, validation, error handling)
6. Add authentication if original used Supabase auth
7. Add request validation schemas
8. Add Swagger documentation

Generate complete production-ready code.`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = BaseMigrator.loadConfig();
  const migrator = new FunctionMigrator(config);

  const args = process.argv.slice(2);
  const aiProviderArg = args.find((arg) => arg.startsWith("--ai-provider="));
  const aiProvider = aiProviderArg
    ? (aiProviderArg.split("=")[1] as "ollama" | "azure" | "gemini")
    : "ollama";

  migrator.migrate({ aiProvider }).catch((error) => {
    console.error("❌ Function migration error:", error.message);
    process.exit(1);
  });
}
