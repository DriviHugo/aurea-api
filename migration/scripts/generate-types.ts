/**
 * Generate TypeScript Types from Prisma - Regular Script (No AI)
 * Generates Prisma Client and exports types for frontend
 */

import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

export async function generateTypes(
  outputDir = "src/types/generated",
): Promise<void> {
  console.log("🔨 Generating Prisma Client...");

  try {
    execSync("npx prisma generate", { stdio: "inherit" });
    console.log("✅ Prisma Client generated");
  } catch (error) {
    console.error("❌ Failed to generate Prisma Client");
    throw error;
  }

  console.log("📝 Exporting types for frontend...");

  // Create types directory
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Generate type exports
  const typeExports = `/**
 * Generated Prisma Types for Frontend
 * Auto-generated from Prisma schema - DO NOT EDIT MANUALLY
 */

export type {
  Expediente,
  Documento,
  Validacion,
  Revision,
  Profile,
  UserRole,
  AuditLog
} from '@prisma/client';

export * from '@prisma/client';

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}
`;

  const indexPath = path.join(outputDir, "index.ts");
  fs.writeFileSync(indexPath, typeExports, "utf-8");

  console.log(`✅ Types exported to ${indexPath}`);
}

// CLI execution
if (import.meta.url === `file://${process.argv[1]}`) {
  generateTypes().catch((error) => {
    console.error("❌ Type generation error:", error.message);
    process.exit(1);
  });
}
