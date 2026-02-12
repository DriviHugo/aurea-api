import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import pg from "pg";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log("\n🔧 Creando usuario de prueba...");

    // Verificar si el usuario ya existe
    const existingUser = await prisma.profile.findUnique({
      where: { email: "test@aurea.com" },
    });

    if (existingUser) {
      console.log("\n⚠️  El usuario test@aurea.com ya existe.");
      console.log("Eliminando usuario anterior...");
      await prisma.profile.delete({
        where: { email: "test@aurea.com" },
      });
    }

    // Hash de la contraseña
    const password = "Test123!";
    const hashedPassword = await bcrypt.hash(password, 10);

    // Crear usuario
    const user = await prisma.profile.create({
      data: {
        id: crypto.randomUUID(),
        email: "test@aurea.com",
        password: hashedPassword,
        nombre: "Usuario",
        apellidos: "de Prueba",
        activo: true,
      },
    });

    console.log("\n✅ Usuario creado exitosamente!");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("📧 Email:      test@aurea.com");
    console.log("🔑 Contraseña: Test123!");
    console.log("👤 Nombre:     Usuario de Prueba");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");
  } catch (error) {
    console.error("\n❌ Error:", error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
