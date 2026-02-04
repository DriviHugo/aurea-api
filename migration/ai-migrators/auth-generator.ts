#!/usr/bin/env tsx

import fs from "fs/promises";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";

/**
 * Authentication System Generator
 *
 * Generates a complete authentication system for Fastify API
 * supporting JWT and Keycloak providers.
 *
 * Usage:
 *   tsx migration/ai-migrators/auth-generator.ts --provider jwt --output src/auth
 *   tsx migration/ai-migrators/auth-generator.ts --provider keycloak --output src/auth
 *   tsx migration/ai-migrators/auth-generator.ts --provider both --output src/auth
 */

const ANTHROPIC_MODEL = "claude-sonnet-4-20250514";
const MAX_TOKENS = 8000;

interface GeneratorOptions {
  provider: "jwt" | "keycloak" | "both";
  outputDir: string;
  apiKey: string;
}

interface GeneratedFile {
  path: string;
  content: string;
}

async function loadPrompt(): Promise<string> {
  const promptPath = path.join(
    process.cwd(),
    "migration/prompts/auth-generator.md",
  );

  try {
    return await fs.readFile(promptPath, "utf-8");
  } catch (error) {
    throw new Error(
      `Failed to load prompt from ${promptPath}: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function generateWithAI(
  prompt: string,
  apiKey: string,
  provider: string,
): Promise<string> {
  const anthropic = new Anthropic({ apiKey });

  const userPrompt = `${prompt}

## Generation Request

Generate ALL 8 files for a production-ready authentication system.

Provider focus: ${provider === "both" ? "Both JWT and Keycloak" : provider.toUpperCase()}

Return the complete code for each file in the following format:

\`\`\`typescript
// File: src/auth/types.ts

[complete file content]
\`\`\`

\`\`\`typescript
// File: src/auth/providers/base.provider.ts

[complete file content]
\`\`\`

... and so on for all 8 files.

IMPORTANT:
- Include ALL files even if provider is JWT or Keycloak only
- Code must be production-ready (no TODOs)
- Follow coding guidelines exactly
- Include proper error handling
- Add JSDoc comments
`;

  console.log("🤖 Generating authentication system with AI...");
  console.log(`   Model: ${ANTHROPIC_MODEL}`);
  console.log(`   Provider: ${provider}`);

  const response = await anthropic.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_TOKENS,
    messages: [
      {
        role: "user",
        content: userPrompt,
      },
    ],
  });

  const content = response.content[0];
  if (content.type !== "text") {
    throw new Error("Unexpected response type from AI");
  }

  return content.text;
}

function parseGeneratedFiles(aiResponse: string): GeneratedFile[] {
  const files: GeneratedFile[] = [];
  const fileRegex = /```typescript\s*\/\/\s*File:\s*(.+?)\s*\n([\s\S]*?)```/g;

  let match: RegExpExecArray | null;
  while ((match = fileRegex.exec(aiResponse)) !== null) {
    const filePath = match[1].trim();
    const content = match[2].trim();
    files.push({ path: filePath, content });
  }

  if (files.length === 0) {
    throw new Error(
      "No files found in AI response. Expected format: // File: path/to/file.ts",
    );
  }

  return files;
}

async function writeGeneratedFiles(
  files: GeneratedFile[],
  outputDir: string,
): Promise<void> {
  console.log(`\n📁 Writing files to ${outputDir}...`);

  for (const file of files) {
    const fullPath = path.join(process.cwd(), file.path);
    const directory = path.dirname(fullPath);

    await fs.mkdir(directory, { recursive: true });
    await fs.writeFile(fullPath, file.content, "utf-8");

    console.log(`✅ Generated ${file.path}`);
  }
}

async function updatePackageJson(): Promise<void> {
  const packageJsonPath = path.join(process.cwd(), "package.json");

  try {
    const content = await fs.readFile(packageJsonPath, "utf-8");
    const packageJson = JSON.parse(content);

    const requiredDeps = {
      jsonwebtoken: "^9.0.2",
      bcrypt: "^5.1.1",
      axios: "^1.6.5",
      "jwks-rsa": "^3.1.0",
    };

    const requiredDevDeps = {
      "@types/jsonwebtoken": "^9.0.5",
      "@types/bcrypt": "^5.0.2",
    };

    let hasChanges = false;

    if (!packageJson.dependencies) {
      packageJson.dependencies = {};
    }

    for (const [dep, version] of Object.entries(requiredDeps)) {
      if (!packageJson.dependencies[dep]) {
        packageJson.dependencies[dep] = version;
        hasChanges = true;
      }
    }

    if (!packageJson.devDependencies) {
      packageJson.devDependencies = {};
    }

    for (const [dep, version] of Object.entries(requiredDevDeps)) {
      if (!packageJson.devDependencies[dep]) {
        packageJson.devDependencies[dep] = version;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      await fs.writeFile(
        packageJsonPath,
        JSON.stringify(packageJson, null, 2) + "\n",
        "utf-8",
      );
      console.log("\n📦 Updated package.json with required dependencies");
      console.log("   Run: npm install");
    }
  } catch (error) {
    console.warn(
      "⚠️  Could not update package.json:",
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}

async function createEnvExample(): Promise<void> {
  const envExamplePath = path.join(process.cwd(), ".env.auth.example");

  const envContent = `# Authentication Configuration
# Choose provider: 'jwt' or 'keycloak'
AUTH_PROVIDER=jwt

# JWT Configuration (when AUTH_PROVIDER=jwt)
JWT_SECRET=change-this-to-a-secure-random-string-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=app-api
JWT_AUDIENCE=app-client

# Keycloak Configuration (when AUTH_PROVIDER=keycloak)
KEYCLOAK_URL=https://keycloak.example.com/auth
KEYCLOAK_REALM=app-realm
KEYCLOAK_CLIENT_ID=app-api
KEYCLOAK_CLIENT_SECRET=your-client-secret-here
# KEYCLOAK_PUBLIC_KEY=optional-public-key-if-not-auto-fetched
`;

  await fs.writeFile(envExamplePath, envContent, "utf-8");
  console.log("\n📄 Created .env.auth.example");
  console.log("   Copy to .env.development and configure");
}

async function generateAuthSystem(options: GeneratorOptions): Promise<void> {
  console.log("🔐 Authentication System Generator");
  console.log("=====================================\n");

  const prompt = await loadPrompt();
  const aiResponse = await generateWithAI(
    prompt,
    options.apiKey,
    options.provider,
  );
  const files = parseGeneratedFiles(aiResponse);

  console.log(`\n✅ Parsed ${files.length} files from AI response`);

  await writeGeneratedFiles(files, options.outputDir);
  await updatePackageJson();
  await createEnvExample();

  console.log("\n✨ Authentication system generated successfully!");
  console.log("\n📋 Next steps:");
  console.log("   1. npm install");
  console.log("   2. Copy .env.auth.example to .env.development");
  console.log("   3. Configure AUTH_PROVIDER and credentials");
  console.log("   4. Register auth plugin in src/server.ts:");
  console.log('      import authPlugin from "./auth";');
  console.log("      await fastify.register(authPlugin);");
  console.log("   5. Register auth routes:");
  console.log('      import { authRoutes } from "./routes/auth.routes";');
  console.log('      await fastify.register(authRoutes, { prefix: "/auth" });');
  console.log("   6. Use in routes:");
  console.log(
    '      import { authenticate } from "./auth/decorators/authenticate";',
  );
  console.log('      import { authorize } from "./auth/decorators/authorize";');
  console.log(
    '      fastify.get("/protected", { preHandler: authenticate }, ...)',
  );
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  let provider: "jwt" | "keycloak" | "both" = "both";
  let outputDir = "src/auth";

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--provider" && args[i + 1]) {
      const value = args[i + 1].toLowerCase();
      if (value === "jwt" || value === "keycloak" || value === "both") {
        provider = value;
      }
      i++;
    } else if (args[i] === "--output" && args[i + 1]) {
      outputDir = args[i + 1];
      i++;
    }
  }

  const apiKey =
    process.env.ANTHROPIC_API_KEY || process.env.MIGRATION_AI_API_KEY;

  if (!apiKey) {
    console.error("❌ Error: ANTHROPIC_API_KEY not found");
    console.error("   Set environment variable: ANTHROPIC_API_KEY=sk-ant-...");
    process.exit(1);
  }

  try {
    await generateAuthSystem({ provider, outputDir, apiKey });
  } catch (error) {
    console.error("\n❌ Generation failed:");
    console.error(error instanceof Error ? error.message : "Unknown error");
    if (error instanceof Error && error.stack) {
      console.error("\nStack trace:");
      console.error(error.stack);
    }
    process.exit(1);
  }
}

main();
