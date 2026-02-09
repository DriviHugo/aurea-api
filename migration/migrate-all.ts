#!/usr/bin/env node
/**
 * Unified Migration Script - Execute all migration steps in sequence
 * Usage: npm run migrate:all <source-project-path>
 */

import * as fs from "fs";
import * as path from "path";
import { spawn } from "child_process";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const INSPECTION_FILE = "./migration/output/inspection.json";
const SCHEMA_FILE = "./prisma/schema.prisma";

interface MigrationStep {
  name: string;
  script: string;
  args: string[];
  description: string;
}

const STEPS: MigrationStep[] = [
  {
    name: "1️⃣  Inspection",
    script: "tsx",
    args: [
      "migration/inspectors/project-inspector.ts",
      "", // source path will be added if provided
      INSPECTION_FILE,
    ],
    description: "Analyzing source project and extracting metadata...",
  },
  {
    name: "2️⃣  Schema Generation",
    script: "tsx",
    args: ["migration/ai-migrators/schema-migrator.ts"],
    description: "Generating Prisma schema from inspection data...",
  },
  {
    name: "3️⃣  Prisma Client Generation",
    script: "npx",
    args: ["prisma", "generate"],
    description: "Generating Prisma Client...",
  },
  {
    name: "4️⃣  CRUD Routes Generation",
    script: "tsx",
    args: ["migration/ai-migrators/route-generator.ts"],
    description: "Generating CRUD routes for all models...",
  },
  {
    name: "5️⃣  Edge Functions Migration",
    script: "tsx",
    args: ["migration/ai-migrators/function-migrator.ts"],
    description: "Migrating Deno edge functions to Fastify routes...",
  },
];

function runCommand(
  command: string,
  args: string[],
  description: string,
): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log(`\n${description}`);
    console.log(`$ ${command} ${args.join(" ")}\n`);

    const child = spawn(command, args, {
      stdio: "inherit",
      shell: true,
      env: { ...process.env },
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Command failed with exit code ${code}`));
      } else {
        resolve();
      }
    });

    child.on("error", (error) => {
      reject(error);
    });
  });
}

async function main() {
  console.log("🚀 AUREA MIGRATION - Full Stack Migration Tool");
  console.log("=".repeat(60));

  const startTime = Date.now();
  let currentStep = 0;

  try {
    // Validate source path if provided
    const sourcePath = process.argv[2];
    if (sourcePath) {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`Source project not found: ${sourcePath}`);
      }
      console.log(`\n📂 Source Project: ${path.resolve(sourcePath)}`);
      // Update inspector args to include source path (replace empty string placeholder)
      STEPS[0].args[1] = sourcePath;
    } else {
      // Remove the empty source path placeholder if no source provided
      STEPS[0].args.splice(1, 1);
    }

    // Execute each step
    for (const step of STEPS) {
      currentStep++;
      console.log(`\n${"=".repeat(60)}`);
      console.log(step.name, step.description);
      console.log("=".repeat(60));

      await runCommand(step.script, step.args, "");

      console.log(`✅ ${step.name} completed`);
    }

    // Success summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`\n${"=".repeat(60)}`);
    console.log("✅ MIGRATION COMPLETED SUCCESSFULLY");
    console.log("=".repeat(60));
    console.log(`⏱️  Total time: ${duration}s`);
    console.log(`📊 Steps completed: ${STEPS.length}/${STEPS.length}`);
    console.log("\n📝 Next steps:");
    console.log("  1. Review generated files in src/routes/generated/");
    console.log("  2. Run: npx prisma migrate dev --name init");
    console.log("  3. Start server: npm run dev");
    console.log("  4. Open Swagger: http://localhost:3000/docs");
    console.log("");
  } catch (error) {
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(
      `\n❌ Migration failed at step ${currentStep}/${STEPS.length}`,
    );
    console.error(`⏱️  Elapsed time: ${duration}s`);
    console.error(
      `\n🔍 Error: ${error instanceof Error ? error.message : String(error)}`,
    );
    console.error("\n💡 Troubleshooting:");
    console.error("  - Check that ANTHROPIC_API_KEY is set in environment");
    console.error("  - Verify source project has valid structure");
    console.error("  - Check migration/ai-migrators/config.json");
    console.error("  - Review logs above for specific error messages");
    process.exit(1);
  }
}

main();
