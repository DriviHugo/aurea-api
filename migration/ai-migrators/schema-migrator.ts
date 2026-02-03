import fs from "fs";
import path from "path";
import Anthropic from "@anthropic-ai/sdk";
import type { ProjectInspection } from "../inspectors/project-inspector.js";

const SCHEMA_PROMPT = fs.readFileSync(
  path.join(import.meta.dirname, "../prompts/schema-migrator.md"),
  "utf-8",
);

export interface SchemaMigrationOptions {
  inspection: ProjectInspection;
  outputPath?: string;
  model?: string;
  provider?: "anthropic" | "gemini";
  dryRun?: boolean;
}

/**
 * Migra SQL Supabase a Prisma schema usando Claude Sonnet 4.5 o Gemini 3
 */
export async function migrateSchemWithAI(
  options: SchemaMigrationOptions,
): Promise<string> {
  const {
    inspection,
    outputPath = "prisma/schema.prisma",
    model = "claude-sonnet-4-20250514",
    provider = "anthropic",
    dryRun = false,
  } = options;

  console.log(`🤖 Migrando schema con IA (modelo: ${model})...`);

  // Validar API key
  if (!process.env["ANTHROPIC_API_KEY"]) {
    throw new Error(
      "ANTHROPIC_API_KEY no configurada. Añade: export ANTHROPIC_API_KEY=sk-ant-...",
    );
  }

  // Consolidar todas las migraciones SQL
  const sqlContent = inspection.migrations
    .map((m) => `-- ${m.filename}\n${m.content}`)
    .join("\n\n");

  if (!sqlContent) {
    throw new Error("No se encontraron migraciones SQL para migrar");
  }

  // Contexto adicional del proyecto
  const projectContext = `
Project: ${inspection.projectName}
Tables detected: ${inspection.supabaseTables.map((t) => t.name).join(", ")}
Edge Functions: ${inspection.edgeFunctions.length}
Has Storage: ${inspection.hasStorage}
Has Realtime: ${inspection.hasRealtime}
Has Auth: ${inspection.hasAuth}
  `.trim();

  console.log(`📄 Procesando ${sqlContent.length} caracteres SQL...`);
  console.log(`🤖 Using ${provider} with model ${model}...`);

  let prismaSchema: string;

  if (provider === "anthropic") {
    // Claude Sonnet 4.5
    const anthropic = new Anthropic({
      apiKey: process.env["ANTHROPIC_API_KEY"],
    });

    const response = await anthropic.messages.create({
      model,
      max_tokens: 16000,
      messages: [
        {
          role: "user",
          content: `${SCHEMA_PROMPT}\n\n## Project Context\n${projectContext}\n\n## SQL Migrations\n\n${sqlContent}`,
        },
      ],
    });

    prismaSchema =
      response.content[0].type === "text" ? response.content[0].text : "";
  } else {
    // Gemini 3
    const geminiKey = process.env["GEMINI_API_KEY"];
    if (!geminiKey)
      throw new Error("GEMINI_API_KEY required for Gemini provider");

    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;

    const geminiResponse = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SCHEMA_PROMPT }] },
        contents: [
          {
            role: "user",
            parts: [
              {
                text: `## Project Context\n${projectContext}\n\n## SQL Migrations\n\n${sqlContent}`,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.3,
          maxOutputTokens: 8192,
        },
      }),
    });

    if (!geminiResponse.ok) {
      const error = (await geminiResponse.json()) as {
        error?: { message?: string };
      };
      throw new Error(
        `Gemini error: ${geminiResponse.status} - ${error.error?.message}`,
      );
    }

    const geminiData = (await geminiResponse.json()) as {
      candidates: Array<{ content: { parts: Array<{ text: string }> } }>;
    };
    if (!geminiData.candidates[0]?.content.parts[0]) {
      throw new Error("Invalid response from Gemini");
    }
    prismaSchema = geminiData.candidates[0].content.parts[0].text;
  }

  // Limpiar posible markdown wrapper
  const cleanedSchema = prismaSchema
    .replace(/```prisma\n?/g, "")
    .replace(/```\n?/g, "")
    .trim();

  console.log(`✅ Schema generado (${cleanedSchema.length} caracteres)`);

  // Guardar o retornar
  if (!dryRun) {
    // Asegurar que existe el directorio
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(outputPath, cleanedSchema);
    console.log(`💾 Schema guardado en: ${outputPath}`);

    // Validar con Prisma CLI
    try {
      const { execSync } = await import("child_process");
      execSync("npx prisma validate", { stdio: "pipe" });
      console.log(`✅ Schema válido (validación Prisma)`);
    } catch (error) {
      console.warn(
        `⚠️  Advertencia: Schema generado pero falló validación Prisma`,
      );
      console.warn(`   Revisa manualmente: ${outputPath}`);
    }
  } else {
    console.log(`🔍 Dry run - Schema no guardado`);
  }

  return cleanedSchema;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const inspectionPath = process.argv[2] || "./migration/inspection.json";
  const outputPath = process.argv[3] || "./prisma/schema.prisma";

  if (!fs.existsSync(inspectionPath)) {
    console.error(`❌ No se encontró inspection.json en: ${inspectionPath}`);
    console.error(`   Ejecuta primero: npm run migrate:inspect`);
    process.exit(1);
  }

  const inspection: ProjectInspection = JSON.parse(
    fs.readFileSync(inspectionPath, "utf-8"),
  );

  migrateSchemWithAI({
    inspection,
    outputPath,
    dryRun: process.argv.includes("--dry-run"),
  })
    .then((schema) => {
      if (process.argv.includes("--dry-run")) {
        console.log("\n--- PREVIEW ---\n");
        console.log(schema.slice(0, 500) + "\n...\n");
      }
    })
    .catch((error) => {
      console.error("❌ Error:", error.message);
      process.exit(1);
    });
}
