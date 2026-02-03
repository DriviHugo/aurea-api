/**
 * AI Component Refactorer
 * Splits "Fat Components" into Hook/Types/UI structure
 */

import * as fs from "fs";
import * as path from "path";
import { BaseMigrator, type MigrationAIConfig } from "./base-migrator.js";
import { glob } from "glob";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ComponentRefactorOptions {
  componentPath: string; // Specific file or pattern
  outputBaseDir?: string; // e.g., src/features
}

export class ComponentRefactorer extends BaseMigrator {
  constructor(config: MigrationAIConfig) {
    super(config);
  }

  async refactor(options: ComponentRefactorOptions): Promise<void> {
    const { componentPath, outputBaseDir = "../aurea-1mb/src/features" } =
      options;

    // Resolve files using glob
    const files = glob.sync(componentPath);

    if (files.length === 0) {
      console.log(`⚠️ No files found for pattern: ${componentPath}`);
      return;
    }

    console.log(`🔍 Found ${files.length} components to refactor`);

    // The prompt template is now embedded
    const systemPrompt = `You are an expert React Refactoring Agent. Your goal is to separate logic from UI (Clean Architecture).

## Input
A single "fat" React component file (vibe coding style) that likely contains:
- Logic inside the component
- Direct Supabase calls
- Inline types
- UI code

## Output Format
You MUST return the code separated into 3 distinct files. Use the following delimiters:

\`\`\`typescript
// === FILE: types.ts ===
export interface ...

// === FILE: useFeature.ts ===
import { useState, useEffect } from 'react';
import { fetchAPI } from '@/lib/api';
import type { ... } from './types';

export function useFeature() {
  ...
}

// === FILE: Component.tsx ===
import { useFeature } from './useFeature';

export function Component() {
  const { data, isLoading } = useFeature();
  
  if (isLoading) return <div>Loading...</div>;
  
  return (
    ...
  );
}
\`\`\`

## Refactoring Rules

1. **Remove Supabase**: All \`supabase.from(...)\` calls must be converted to \`fetchAPI('/api/endpoint')\` calls inside the Hook.
2. **Extract Logic**: Move all \`useEffect\`, \`useState\` (business state), and data fetching into the custom hook.
3. **Leave UI Only**: The Component should ONLY contain JSX and UI-related state (like form input focus, simple toggles).
4. **Strict Typing**: Do not use \`any\`. Create proper interfaces in \`types.ts\`.
5. **Use Features Pattern**: Assume these files will live in \`src/features/<featureName>/\`.
6. **Keep UI Libraries**: Keep \`shadcn/ui\` components (\`Button\`, \`Card\`, etc.) and Tailwind classes exactly as they are.`;

    for (const file of files) {
      // Skip small files (likely simple UI)
      const code = fs.readFileSync(file, "utf-8");
      if (code.split("\n").length < 50) {
        console.log(`⏩ Skipping ${path.basename(file)} (too small)`);
        continue;
      }

      console.log(`\n🤖 Refactoring: ${path.basename(file)}`);

      const componentName = path.basename(file, path.extname(file));
      const featureDir = path.join(outputBaseDir, componentName.toLowerCase());

      // Create feature directory
      if (!fs.existsSync(featureDir)) {
        fs.mkdirSync(featureDir, { recursive: true });
      }

      try {
        // Generate refactored code
        const userPrompt = `Refactor this component:\n\n${code}`;
        const response = await super.generate(systemPrompt, userPrompt);

        // Parse response
        await this.parseAndSave(response, featureDir);
        console.log(`✅ Saved to: ${featureDir}`);
      } catch (error) {
        console.error(`❌ Failed to refactor ${file}:`, error);
      }
    }
  }

  private async parseAndSave(response: string, outputDir: string) {
    // Regex to match the delimiters
    // // === FILE: filename.ext ===
    const fileRegex =
      /\/\/\s*===\s*FILE:\s*([a-zA-Z0-9_.-]+)\s*===\s*([\s\S]*?)(?=\/\/\s*===\s*FILE:|$)/g;

    let match;
    let found = false;

    while ((match = fileRegex.exec(response)) !== null) {
      found = true;
      const filename = (match[1] || "unknown").trim();
      const content = (match[2] || "").trim();

      const filePath = path.join(outputDir, filename);
      fs.writeFileSync(filePath, content, "utf-8");
      console.log(`   📄 Wrote ${filename}`);
    }

    if (!found) {
      // Fallback: If AI didn't format correctly, dump to specialized debug file
      console.warn(
        "   ⚠️ Could not parse structured output. Saving raw response.",
      );
      fs.writeFileSync(
        path.join(outputDir, "refactor_dump.txt"),
        response,
        "utf-8",
      );
    }
  }
}

// CLI Execution if run directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const apiKey =
    process.env["ANTHROPIC_API_KEY"] || process.env["GEMINI_API_KEY"];
  if (!apiKey) {
    console.error("❌ API Key required (ANTHROPIC_API_KEY or GEMINI_API_KEY)");
    process.exit(1);
  }

  const provider = process.env["ANTHROPIC_API_KEY"] ? "anthropic" : "gemini";
  const refactorer = new ComponentRefactorer({ provider, apiKey });

  const target = process.argv[2] || "../aurea-1mb/src/pages/*.tsx";

  refactorer.refactor({ componentPath: target }).catch(console.error);
}
