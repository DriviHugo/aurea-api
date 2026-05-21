import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcrypt";
import "dotenv/config";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function resetPasswords() {
  try {
    // Generar nuevo hash para "password"
    const hash = await bcrypt.hash("password", 12);
    
    console.log("Nuevo hash generado para 'password':");
    console.log(hash);
    console.log("");

    // Actualizar las contraseñas en la BD
    const result = await prisma.profile.updateMany({
      where: {
        email: {
          in: ["admin@example.com", "user@example.com"],
        },
      },
      data: {
        password: hash,
        active: true,
      },
    });

    console.log(`✅ Contraseñas reseteadas exitosamente`);
    console.log(`   Usuarios actualizados: ${result.count}`);
    console.log(`   Email: admin@example.com`);
    console.log(`   Email: user@example.com`);
    console.log(`   Password: password`);
    console.log("");
    console.log("Ahora puedes hacer login con estos usuarios.");
    console.log("");
    console.log("⚠️  IMPORTANTE: Actualiza el hash en prisma/seeds/dev/00_profiles.js");
    console.log(`   con: ${hash}`);
  } catch (error) {
    console.error("❌ Error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

resetPasswords();
