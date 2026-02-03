/**
 * Validate Prisma Schema - Regular Script (No AI)
 * Validates generated Prisma schema and checks for common issues
 */

import { execSync } from "child_process";
import * as fs from "fs";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  stats: {
    models: number;
    enums: number;
    relations: number;
  };
}

export async function validatePrismaSchema(
  schemaPath = "prisma/schema.prisma",
): Promise<ValidationResult> {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    stats: { models: 0, enums: 0, relations: 0 },
  };

  console.log("🔍 Validating Prisma schema...");

  // Check schema exists
  if (!fs.existsSync(schemaPath)) {
    result.valid = false;
    result.errors.push(`Schema file not found: ${schemaPath}`);
    return result;
  }

  const schemaContent = fs.readFileSync(schemaPath, "utf-8");

  // Count models, enums, relations
  result.stats.models = (schemaContent.match(/^model \w+/gm) || []).length;
  result.stats.enums = (schemaContent.match(/^enum \w+/gm) || []).length;
  result.stats.relations = (schemaContent.match(/@relation/g) || []).length;

  console.log(
    `📊 Stats: ${result.stats.models} models, ${result.stats.enums} enums, ${result.stats.relations} relations`,
  );

  // Run Prisma validate
  try {
    execSync("npx prisma validate", { stdio: "pipe", encoding: "utf-8" });
    console.log("✅ Prisma schema is valid");
  } catch (error: any) {
    result.valid = false;
    result.errors.push("Prisma validation failed");
    result.errors.push(error.stderr || error.message);
    return result;
  }

  // Check for common issues
  if (!schemaContent.includes('provider = "postgresql"')) {
    result.warnings.push("PostgreSQL provider not detected");
  }

  if (!schemaContent.includes("@@map(")) {
    result.warnings.push(
      "No @@map directives found - table names may not match Supabase",
    );
  }

  // Check for missing indexes on foreign keys
  const foreignKeys = schemaContent.match(/@relation\([^)]+\)/g) || [];
  const indexes = schemaContent.match(/@@index\([^)]+\)/g) || [];
  if (foreignKeys.length > indexes.length) {
    result.warnings.push(
      `${foreignKeys.length - indexes.length} foreign keys without indexes - may impact performance`,
    );
  }

  if (result.warnings.length > 0) {
    console.log("⚠️  Warnings:");
    result.warnings.forEach((w) => console.log(`  - ${w}`));
  }

  return result;
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  validatePrismaSchema()
    .then((result) => {
      if (!result.valid) {
        console.error("❌ Validation failed");
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error("❌ Validation error:", error.message);
      process.exit(1);
    });
}
