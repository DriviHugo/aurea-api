import fs from "fs";
import path from "path";
import { glob } from "glob";

export interface Table {
  name: string;
  columns: Column[];
  relations: Relation[];
}

export interface Column {
  name: string;
  type: string;
  nullable: boolean;
  default?: string;
}

export interface Relation {
  name: string;
  type: "oneToOne" | "oneToMany" | "manyToOne" | "manyToMany";
  target: string;
  foreignKey?: string;
}

export interface EdgeFunction {
  name: string;
  path: string;
  hasAI: boolean;
  usesAI: boolean; // Alias for compatibility
  aiProvider?: string;
  dependencies: string[];
}

export interface Hook {
  name: string;
  path: string;
  file: string; // Filename for output
  operations: string[];
  tables: string[];
  usesAuth: boolean;
  usesStorage: boolean;
  usesRealtime: boolean;
}

export interface SQLMigration {
  filename: string;
  path: string;
  content: string;
  tables: string[];
  enums: string[];
  hasRLS: boolean;
}

export interface ProjectInspection {
  projectName: string;
  projectPath: string;
  timestamp: string;
  supabaseTables: Table[];
  edgeFunctions: EdgeFunction[];
  hooks: Hook[];
  migrations: SQLMigration[];
  hasStorage: boolean;
  hasRealtime: boolean;
  hasAuth: boolean;
  framework: "react" | "vue" | "svelte";
}

export async function inspectLovableProject(
  projectPath: string,
): Promise<ProjectInspection> {
  console.log(`🔍 Inspecting project: ${projectPath}`);

  const inspection: ProjectInspection = {
    projectName: path.basename(projectPath),
    projectPath,
    timestamp: new Date().toISOString(),
    supabaseTables: await inspectTables(projectPath),
    edgeFunctions: await inspectEdgeFunctions(projectPath),
    hooks: await inspectHooks(projectPath),
    migrations: await inspectMigrations(projectPath),
    hasStorage: await detectStorageUsage(projectPath),
    hasRealtime: await detectRealtimeUsage(projectPath),
    hasAuth: await detectAuthUsage(projectPath),
    framework: detectFramework(projectPath),
  };

  console.log(`✅ Inspection completed:`);
  console.log(`   - ${inspection.supabaseTables.length} tables`);
  console.log(`   - ${inspection.edgeFunctions.length} edge functions`);
  console.log(`   - ${inspection.hooks.length} hooks`);
  console.log(`   - ${inspection.migrations.length} SQL migrations`);

  return inspection;
}

async function inspectTables(projectPath: string): Promise<Table[]> {
  const typesPath = path.join(
    projectPath,
    "src/integrations/supabase/types.ts",
  );

  if (!fs.existsSync(typesPath)) {
    console.warn("⚠️  Supabase types.ts not found");
    return [];
  }

  const content = fs.readFileSync(typesPath, "utf-8");

  const tableRegex = /(\w+):\s*\{\s*Row:/g;
  const matches = [...content.matchAll(tableRegex)];
  const tableNames = matches.map((m) => m[1]);

  console.log(`   📋 Detected ${tableNames.length} tables`);

  return tableNames
    .filter((name): name is string => name !== undefined)
    .map((name) => ({
      name,
      columns: [],
      relations: [],
    }));
}

async function inspectEdgeFunctions(
  projectPath: string,
): Promise<EdgeFunction[]> {
  const functionsPath = path.join(projectPath, "supabase/functions");

  if (!fs.existsSync(functionsPath)) {
    console.warn("⚠️  supabase/functions directory not found");
    return [];
  }

  const functionDirs = fs
    .readdirSync(functionsPath, { withFileTypes: true })
    .filter((dirent) => dirent.isDirectory())
    .map((dirent) => dirent.name);

  const functions: EdgeFunction[] = [];

  for (const funcName of functionDirs) {
    const funcPath = path.join(functionsPath, funcName, "index.ts");

    if (!fs.existsSync(funcPath)) continue;

    const content = fs.readFileSync(funcPath, "utf-8");

    const hasAI = detectAIUsage(content);
    functions.push({
      name: funcName,
      path: funcPath,
      hasAI,
      usesAI: hasAI, // Alias for compatibility
      aiProvider: extractAIProvider(content) || "",
      dependencies: extractDependencies(content),
    });
  }

  console.log(`   ⚡ Detected ${functions.length} edge functions`);

  return functions;
}

async function inspectHooks(projectPath: string): Promise<Hook[]> {
  const hooksPath = path.join(projectPath, "src/hooks");

  if (!fs.existsSync(hooksPath)) {
    console.warn("⚠️  src/hooks directory not found");
    return [];
  }

  const hookFiles = await glob("*.ts", { cwd: hooksPath });
  const hooks: Hook[] = [];

  for (const hookFile of hookFiles) {
    const hookPath = path.join(hooksPath, hookFile);
    const content = fs.readFileSync(hookPath, "utf-8");

    hooks.push({
      name: path.parse(hookFile).name,
      path: hookPath,
      file: hookFile,
      operations: extractOperations(content),
      tables: extractTables(content),
      usesAuth: content.includes("supabase.auth"),
      usesStorage: content.includes("supabase.storage"),
      usesRealtime: content.includes(".channel(") || content.includes(".on("),
    });
  }

  console.log(`   🪝 Detected ${hooks.length} hooks`);

  return hooks;
}

async function inspectMigrations(projectPath: string): Promise<SQLMigration[]> {
  const migrationsPath = path.join(projectPath, "supabase/migrations");

  if (!fs.existsSync(migrationsPath)) {
    console.warn("⚠️  supabase/migrations directory not found");
    return [];
  }

  const sqlFiles = await glob("*.sql", { cwd: migrationsPath });
  const migrations: SQLMigration[] = [];

  for (const sqlFile of sqlFiles) {
    const sqlPath = path.join(migrationsPath, sqlFile);
    const content = fs.readFileSync(sqlPath, "utf-8");

    migrations.push({
      filename: sqlFile,
      path: sqlPath,
      content,
      tables: extractSQLTables(content),
      enums: extractSQLEnums(content),
      hasRLS:
        content.includes("CREATE POLICY") ||
        content.includes("ENABLE ROW LEVEL SECURITY"),
    });
  }

  console.log(`   📄 Detected ${migrations.length} SQL migrations`);

  return migrations;
}

async function detectStorageUsage(projectPath: string): Promise<boolean> {
  const srcPath = path.join(projectPath, "src");
  const files = await glob("**/*.{ts,tsx}", { cwd: srcPath });

  for (const file of files) {
    const content = fs.readFileSync(path.join(srcPath, file), "utf-8");
    if (content.includes("supabase.storage")) {
      return true;
    }
  }

  return false;
}

async function detectRealtimeUsage(projectPath: string): Promise<boolean> {
  const srcPath = path.join(projectPath, "src");
  const files = await glob("**/*.{ts,tsx}", { cwd: srcPath });

  for (const file of files) {
    const content = fs.readFileSync(path.join(srcPath, file), "utf-8");
    if (content.includes(".channel(") || content.includes("postgres_changes")) {
      return true;
    }
  }

  return false;
}

async function detectAuthUsage(projectPath: string): Promise<boolean> {
  const srcPath = path.join(projectPath, "src");
  const files = await glob("**/*.{ts,tsx}", { cwd: srcPath });

  for (const file of files) {
    const content = fs.readFileSync(path.join(srcPath, file), "utf-8");
    if (content.includes("supabase.auth")) {
      return true;
    }
  }

  return false;
}

function detectFramework(projectPath: string): "react" | "vue" | "svelte" {
  const packagePath = path.join(projectPath, "package.json");
  const pkg = JSON.parse(fs.readFileSync(packagePath, "utf-8"));

  if (pkg.dependencies?.["react"]) return "react";
  if (pkg.dependencies?.["vue"]) return "vue";
  if (pkg.dependencies?.["svelte"]) return "svelte";

  return "react"; // default
}

function detectAIUsage(content: string): boolean {
  return (
    content.includes("ai.gateway") ||
    content.includes("openai") ||
    content.includes("anthropic") ||
    content.includes("gemini") ||
    content.includes("LOVABLE_API_KEY")
  );
}

function extractAIProvider(content: string): string | undefined {
  if (content.includes("google/gemini")) return "gemini";
  if (content.includes("openai/gpt")) return "openai";
  if (content.includes("anthropic/claude")) return "anthropic";
  if (content.includes("LOVABLE_API_KEY")) return "lovable-hub";
  return undefined;
}

function extractDependencies(content: string): string[] {
  const imports = content.matchAll(/from ["']([^"']+)["']/g);
  return [
    ...new Set(
      [...imports]
        .map((m) => m[1])
        .filter((dep): dep is string => dep !== undefined),
    ),
  ];
}

function extractOperations(content: string): string[] {
  const ops: string[] = [];
  if (content.includes(".select(")) ops.push("select");
  if (content.includes(".insert(")) ops.push("insert");
  if (content.includes(".update(")) ops.push("update");
  if (content.includes(".delete(")) ops.push("delete");
  if (content.includes(".upsert(")) ops.push("upsert");
  return ops;
}

function extractTables(content: string): string[] {
  const tableMatches = content.matchAll(/\.from\(["'](\w+)["']\)/g);
  return [
    ...new Set(
      [...tableMatches]
        .map((m) => m[1])
        .filter((t): t is string => t !== undefined),
    ),
  ];
}

function extractSQLTables(content: string): string[] {
  const tableMatches = content.matchAll(/CREATE TABLE (?:public\.)?(\w+)/gi);
  return [
    ...new Set(
      [...tableMatches]
        .map((m) => m[1])
        .filter((t): t is string => t !== undefined),
    ),
  ];
}

function extractSQLEnums(content: string): string[] {
  const enumMatches = content.matchAll(
    /CREATE TYPE (?:public\.)?(\w+) AS ENUM/gi,
  );
  return [
    ...new Set(
      [...enumMatches]
        .map((m) => m[1])
        .filter((e): e is string => e !== undefined),
    ),
  ];
}

// CLI usage
(async () => {
  const isMainModule = import.meta.url === `file://${process.argv[1]}`;
  if (isMainModule) {
    const projectPath = process.argv[2] || process.cwd();
    const outputPath = process.argv[3] || "./migration/output/inspection.json";

    try {
      const inspection = await inspectLovableProject(projectPath);
      // Ensure directory exists
      const fs = await import("fs");
      const path = await import("path");
      const dir = path.dirname(outputPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(outputPath, JSON.stringify(inspection, null, 2));
      console.log(`\n✅ Inspection guardada en: ${outputPath}`);
    } catch (error) {
      console.error("❌ Error:", error);
      process.exit(1);
    }
  }
})();
