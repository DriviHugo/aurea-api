/**
 * AI Route Generator - AI-Assisted Script
 * Generates Fastify CRUD routes from Prisma schema using Claude/Gemini
 */

import * as fs from "fs";
import * as path from "path";
import { BaseMigrator, type MigrationAIConfig } from "./base-migrator.js";

export interface RouteGenerationOptions {
  schemaPath?: string;
  outputDir?: string;
  includeAuth?: boolean;
  includeValidation?: boolean;
  includeSwagger?: boolean;
}

export class RouteGenerator extends BaseMigrator {
  constructor(config: MigrationAIConfig) {
    super(config);
  }

  async generateRoutes(options: RouteGenerationOptions = {}): Promise<void> {
    const {
      schemaPath = "prisma/schema.prisma",
      outputDir = "src/routes/generated",
      includeAuth = true,
      includeValidation = true,
      includeSwagger = true,
    } = options;

    console.log("📖 Reading Prisma schema...");
    if (!fs.existsSync(schemaPath)) {
      throw new Error(`Schema not found: ${schemaPath}`);
    }

    const schemaContent = fs.readFileSync(schemaPath, "utf-8");

    // Extract models from schema
    const models = this.extractModels(schemaContent);
    console.log(`📝 Found ${models.length} models: ${models.join(", ")}`);

    const systemPrompt = this.buildRoutePrompt(
      includeAuth,
      includeValidation,
      includeSwagger,
    );

    for (const model of models) {
      console.log(`🤖 Generating routes for ${model}...`);

      const userPrompt = `Generate CRUD routes for model: ${model}

Prisma Schema:
\`\`\`prisma
${this.extractModelDefinition(schemaContent, model)}
\`\`\`

Requirements:
- Fastify plugin with TypeScript
- CRUD operations: GET (list), GET /:id, POST, PUT /:id, DELETE /:id
- Pagination for list (page, limit)
- Error handling (404, 400, 500)
${includeAuth ? "- Authentication required (authAccessToken plugin)" : ""}
${includeValidation ? "- AJV schema validation" : ""}
${includeSwagger ? "- Swagger/OpenAPI decorators" : ""}
`;

      const routeCode = await super.generate(systemPrompt, userPrompt);
      const cleanedCode = super.cleanMarkdownWrapper(routeCode);

      // Save to file
      const routeFileName = this.modelToRouteName(model);
      const routePath = path.join(outputDir, routeFileName);

      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }

      fs.writeFileSync(routePath, cleanedCode, "utf-8");
      console.log(`✅ Generated: ${routePath}`);
    }

    console.log("\n✅ Route generation complete!");
    console.log(`📁 Routes saved to: ${outputDir}`);
  }

  private extractModels(schema: string): string[] {
    const modelRegex = /^model (\w+)/gm;
    const models: string[] = [];
    let match;

    while ((match = modelRegex.exec(schema)) !== null) {
      if (match[1]) {
        models.push(match[1]);
      }
    }

    return models;
  }

  private extractModelDefinition(schema: string, modelName: string): string {
    const modelRegex = new RegExp(`model ${modelName} \\{[^}]+\\}`, "s");
    const match = schema.match(modelRegex);
    return match ? match[0] : "";
  }

  private modelToRouteName(modelName: string): string {
    // ExpedienteEntity -> expediente.routes.ts
    const baseName = modelName.replace(/Entity$/, "");
    return `${baseName.toLowerCase()}.routes.ts`;
  }

  private buildRoutePrompt(
    includeAuth: boolean,
    includeValidation: boolean,
    includeSwagger: boolean,
  ): string {
    return `You are an expert backend developer specializing in Fastify + Prisma + TypeScript.

Generate production-ready CRUD routes following these patterns:

**File Structure:**
\`\`\`typescript
import type { FastifyPluginAsync } from 'fastify';
import type { PrismaClient } from '@prisma/client';

const routes: FastifyPluginAsync = async (fastify) => {
  const prisma: PrismaClient = fastify.prisma;

  // Routes here
};

export default routes;
\`\`\`

**Patterns to follow:**
1. Use Fastify's async/await error handling
2. Return proper HTTP status codes (200, 201, 404, 400, 500)
3. Pagination: \`{ page: 1, limit: 10 }\` → \`{ data: [], total, page, limit, totalPages }\`
4. ID validation: Check if entity exists before update/delete${includeAuth ? "\n5. Auth: Use \`{ preValidation: [fastify.authAccessToken] }\`" : ""}${includeValidation ? "\n6. Validation: AJV schemas in route options" : ""}${includeSwagger ? "\n7. Swagger: Add schema: { tags, description, response, body }" : ""}

**Error handling example:**
\`\`\`typescript
const entity = await prisma.model.findUnique({ where: { id } });
if (!entity) {
  return reply.status(404).send({ error: 'Entity not found' });
}
\`\`\`

Generate complete, production-ready code with NO placeholders or "... existing code ..." comments.`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = BaseMigrator.loadConfig();
  const generator = new RouteGenerator(config);

  const args = process.argv.slice(2);
  const options: RouteGenerationOptions = {
    includeAuth: !args.includes("--no-auth"),
    includeValidation: !args.includes("--no-validation"),
    includeSwagger: !args.includes("--no-swagger"),
  };

  generator.generateRoutes(options).catch((error) => {
    console.error("❌ Route generation error:", error.message);
    process.exit(1);
  });
}
