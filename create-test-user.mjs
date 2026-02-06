import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcryptjs";

const connectionString =
  process.env.DATABASE_URL ||
  "postgresql://postgres:postgres@localhost:5432/aurea";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createTestUser() {
  try {
    const userId = "00000000-0000-0000-0000-000000000001";

    // Crear usuario de prueba
    const user = await prisma.profile.create({
      data: {
        id: userId,
        email: "test@aurea.dev",
        nombre: "Usuario",
        apellidos: "De Prueba",
        activo: true,
      },
    });

    // Crear rol de gestor
    await prisma.userRole.create({
      data: {
        userId: userId,
        role: "admin",
      },
    });

    console.log("✅ Usuario de prueba creado:");
    console.log("   Email: test@aurea.dev");
    console.log("   Nombre: Usuario De Prueba");
    console.log("   Rol: admin");
    console.log(`   ID: ${user.id}`);
    console.log(
      "\n⚠️  NOTA: Este backend no tiene sistema de autenticación implementado.",
    );
    console.log(
      "   Las rutas están protegidas pero puedes deshabilitarlas temporalmente.",
    );
  } catch (error) {
    if (error.code === "P2002") {
      console.log("ℹ️  El usuario ya existe");
    } else {
      console.error("❌ Error:", error);
    }
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createTestUser();
