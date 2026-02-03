/**
 * AI Hook Transformer - AI-Assisted Script
 * Converts React hooks (Supabase) to REST API fetch calls
 */

import * as fs from "fs";
import * as path from "path";
import { BaseMigrator, type MigrationAIConfig } from "./base-migrator.js";
import type { ProjectInspection } from "../inspectors/project-inspector.js";

export interface HookTransformOptions {
  inspectionPath?: string;
  sourceHooksDir?: string;
  outputDir?: string;
  useTanStackQuery?: boolean;
}

export class HookTransformer extends BaseMigrator {
  constructor(config: MigrationAIConfig) {
    super(config);
  }

  async transform(options: HookTransformOptions = {}): Promise<void> {
    const {
      inspectionPath = "migration/inspection.json",
      sourceHooksDir = "../aurea-1mb/src/hooks",
      outputDir = "src/hooks/generated",
      useTanStackQuery = true,
    } = options;

    console.log("📖 Reading inspection data...");
    const inspection: ProjectInspection = JSON.parse(
      fs.readFileSync(inspectionPath, "utf-8"),
    );

    if (!inspection.hooks || inspection.hooks.length === 0) {
      console.log("ℹ️  No hooks found to transform");
      return;
    }

    console.log(`📝 Found ${inspection.hooks.length} hooks to transform`);

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    for (const hook of inspection.hooks) {
      // Skip utility hooks (no Supabase operations)
      if (hook.operations.length === 0) {
        console.log(`⏭️  Skipping ${hook.name} (no Supabase operations)`);
        continue;
      }

      console.log(`\n🤖 Transforming: ${hook.name}`);

      const hookPath = path.join(sourceHooksDir, hook.file);
      if (!fs.existsSync(hookPath)) {
        console.warn(`⚠️  Hook file not found: ${hookPath}`);
        continue;
      }

      const originalCode = fs.readFileSync(hookPath, "utf-8");

      const systemPrompt = this.buildHookPrompt(useTanStackQuery);
      const userPrompt = this.buildUserPrompt(
        hook.name,
        originalCode,
        hook.operations,
      );

      const transformedCode = await super.generate(systemPrompt, userPrompt);
      const cleanedCode = super.cleanMarkdownWrapper(transformedCode);

      // Save to file
      const outputPath = path.join(outputDir, hook.file);
      fs.writeFileSync(outputPath, cleanedCode, "utf-8");
      console.log(`✅ Transformed: ${outputPath}`);
    }

    console.log("\n✅ Hook transformation complete!");
    console.log(`📁 Hooks saved to: ${outputDir}`);
  }

  private buildHookPrompt(useTanStackQuery: boolean): string {
    return `You are an expert in React hooks and REST API integration.

Convert Supabase Client hooks to REST API fetch calls.

**Key conversions:**

1. **Supabase select → GET request:**
\`\`\`typescript
// Before (Supabase)
const { data } = await supabase.from('expedientes').select('*');

// After (REST API)
const response = await fetch('/api/expedientes');
const data = await response.json();
\`\`\`

2. **Supabase insert → POST request:**
\`\`\`typescript
// Before
const { data } = await supabase.from('expedientes').insert(newData);

// After
const response = await fetch('/api/expedientes', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(newData),
});
const data = await response.json();
\`\`\`

3. **Supabase update → PUT request:**
\`\`\`typescript
// Before
await supabase.from('expedientes').update(updates).eq('id', id);

// After
await fetch(\`/api/expedientes/\${id}\`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(updates),
});
\`\`\`

4. **Supabase delete → DELETE request:**
\`\`\`typescript
// Before
await supabase.from('expedientes').delete().eq('id', id);

// After
await fetch(\`/api/expedientes/\${id}\`, { method: 'DELETE' });
\`\`\`

${
  useTanStackQuery
    ? `**Use @tanstack/react-query:**
\`\`\`typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export function useExpedientes() {
  return useQuery({
    queryKey: ['expedientes'],
    queryFn: async () => {
      const response = await fetch('/api/expedientes');
      if (!response.ok) throw new Error('Failed to fetch');
      return response.json();
    },
  });
}

export function useCreateExpediente() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: NewExpediente) => {
      const response = await fetch('/api/expedientes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to create');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expedientes'] });
    },
  });
}
\`\`\`
`
    : ""
}

**Important:**
- Preserve error handling and loading states
- Add proper TypeScript types
- Use environment variable for API base URL: \`const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';\`
- Handle authentication (cookies are sent automatically)
- Return same interface as original hook`;
  }

  private buildUserPrompt(
    hookName: string,
    originalCode: string,
    operations: string[],
  ): string {
    return `Convert this React hook from Supabase Client to REST API fetch calls:

**Hook Name:** ${hookName}
**Operations detected:** ${operations.join(", ")}

**Original Code:**
\`\`\`typescript
${originalCode}
\`\`\`

**Requirements:**
1. Replace all Supabase Client calls with fetch() to REST API
2. Preserve business logic, state management, error handling
3. Use @tanstack/react-query for data fetching (useQuery/useMutation)
4. Add proper TypeScript types
5. Use environment variable for API URL
6. Handle loading and error states
7. Maintain same hook interface (return values, function signatures)

Generate complete production-ready code with NO placeholders.`;
  }
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  const config = BaseMigrator.loadConfig();
  const transformer = new HookTransformer(config);

  const args = process.argv.slice(2);
  const options: HookTransformOptions = {
    useTanStackQuery: !args.includes("--no-tanstack"),
  };

  transformer.transform(options).catch((error) => {
    console.error("❌ Hook transformation error:", error.message);
    process.exit(1);
  });
}
