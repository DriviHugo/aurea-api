import fs from "fs";
import path from "path";
import { execSync } from "child_process";

// Colores para la consola
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  red: "\x1b[31m",
  cyan: "\x1b[36m",
};

function log(message: string, color: string = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function header(message: string) {
  console.log("\n" + "=".repeat(60));
  log(`🚀 ${message}`, colors.bright + colors.cyan);
  console.log("=".repeat(60) + "\n");
}

function runStep(command: string, stepName: string): boolean {
  log(`\n👉 Ejecutando paso: ${stepName}...`, colors.yellow);
  try {
    execSync(command, { stdio: "inherit" });
    log(`✅ ${stepName} completado con éxito.`, colors.green);
    return true;
  } catch (error) {
    log(`❌ Error en ${stepName}.`, colors.red);
    return false;
  }
}

function checkEnv() {
  if (!process.env.ANTHROPIC_API_KEY && !process.env.GEMINI_API_KEY) {
    log(
      "⚠️  ADVERTENCIA: No se detectaron API KEYS (ANTHROPIC_API_KEY o GEMINI_API_KEY).",
      colors.yellow,
    );
    log(
      "   La migración AI necesitará estas claves. Asegúrate de tenerlas en tu .env",
      colors.yellow,
    );
  } else {
    log("✅ API Keys detectadas.", colors.green);
  }
}

(async () => {
  header("MIGRATION ORCHESTRATOR - 1MILLIONBOT");

  // 0. Check Environment
  checkEnv();

  // Obtener argumentos (path del proyecto opcional)
  const targetProject = process.argv[2];
  if (targetProject) {
    log(`🎯 Proyecto objetivo detectado: ${targetProject}`, colors.blue);
    // Podríamos inyectar esto en el environment para que los subscripts lo usen si fuera necesario
    process.env.TARGET_PROJECT_PATH = targetProject;
  }

  // 1. Inspect
  if (
    !runStep(
      "npm run migrate:inspect",
      "Inspección del Proyecto (Supabase/SQL)",
    )
  )
    return;

  // 2. Schema Migration
  if (!runStep("npm run migrate:schema", "Migración de Schema (Prisma)"))
    return;

  // 3. Validation
  // Validamos el schema generado antes de seguir
  if (!runStep("npx prisma validate", "Validación de Schema")) {
    log(
      "⚠️  El schema generado tiene errores. Por favor revísalo en prisma/schema.prisma antes de continuar.",
      colors.red,
    );
    process.exit(1);
  }

  // 4. Generate Prisma Client
  // Necesario para que el backend compile
  runStep("npx prisma generate", "Generación de Cliente Prisma");

  // 5. Auth Setup
  // Configurar autenticación básica
  // runStep("npm run migrate:auth", "Configuración de Auth");

  // 6. Routes & Controllers
  if (
    !runStep(
      "npm run migrate:routes",
      "Generación de Rutas y Controladores (Fastify)",
    )
  )
    return;

  // 7. Edge Functions Logic
  runStep(
    "npm run migrate:functions",
    "Migración de Edge Functions (Business Logic)",
  );

  // 8. Hooks & Frontend Utils
  // Esto genera versiones refactorizadas de los hooks
  runStep("npm run migrate:hooks", "Refactorización de Hooks");

  // 9. Components (Frontend)
  // Opcional, dependiendo de la profundidad
  runStep("npm run migrate:frontend", "Refactorización de Componentes UI");

  header("🎉 MIGRACIÓN AUTOMATIZADA COMPLETADA");
  log("Siguientes pasos recomendados:", colors.bright);
  log(
    "1. Revisa `prisma/schema.prisma` y ajusta tipos si es necesario.",
    colors.cyan,
  );
  log(
    "2. Revisa `src/routes` para asegurar la lógica de negocio.",
    colors.cyan,
  );
  log(
    "3. Ejecuta `npm run docker:up` para levantar la base de datos local.",
    colors.cyan,
  );
  log(
    "4. Ejecuta `npx prisma migrate dev` para aplicar el schema a la DB.",
    colors.cyan,
  );
  log("5. Inicia el servidor con `npm run dev`.", colors.cyan);
})();
