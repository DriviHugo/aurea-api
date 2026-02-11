import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";

const prisma = new PrismaClient();

async function checkAndCreateTestUser() {
  try {
    // Verificar usuarios existentes
    const count = await prisma.profile.count();
    console.log(`\n📊 Usuarios en base de datos: ${count}`);

    if (count === 0) {
      console.log("\n🔨 Creando usuario de prueba...");

      // Hash de la contraseña
      const hashedPassword = await bcrypt.hash("Test123!", 10);

      // Crear usuario
      const user = await prisma.profile.create({
        data: {
          email: "test@aurea.com",
          password: hashedPassword,
          nombre: "Usuario",
          apellidos: "de Prueba",
          rol: "tramitador",
        },
      });

      console.log("\n✅ Usuario creado exitosamente:");
      console.log(`   Email: ${user.email}`);
      console.log(`   Contraseña: Test123!`);
      console.log(`   Rol: ${user.rol}`);
    } else {
      // Listar usuarios existentes
      const users = await prisma.profile.findMany({
        select: {
          id: true,
          email: true,
          nombre: true,
          apellidos: true,
          rol: true,
        },
      });

      console.log("\n👥 Usuarios existentes:");
      users.forEach((u) => {
        console.log(
          `   - ${u.email} (${u.nombre} ${u.apellidos}) - Rol: ${u.rol}`,
        );
      });
    }
  } catch (error) {
    console.error("\n❌ Error:", error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateTestUser();
