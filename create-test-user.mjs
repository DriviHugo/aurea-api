import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcrypt';
import pg from 'pg';

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  try {
    console.log('\n🔍 Verificando usuarios existentes...');
    
    const users = await prisma.profile.findMany({
      select: {
        id: true,
        email: true,
        nombre: true,
        apellidos: true,
      }
    });
    
    console.log(`📊 Usuarios encontrados: ${users.length}`);
    
    if (users.length > 0) {
      console.log('\n👥 Usuarios en la base de datos:');
      users.forEach(u => {
        console.log(`   - ${u.email} (${u.nombre} ${u.apellidos || ''})`);
      });
      
      console.log('\n💡 Prueba con alguno de estos emails y contraseña: password');
    } else {
      console.log('\n🔨 No hay usuarios. Creando usuario de prueba...');
      
      // Hash de la contraseña "Test123!"
      const hashedPassword = await bcrypt.hash('Test123!', 10);
      
      const user = await prisma.profile.create({
        data: {
          id: crypto.randomUUID(),
          email: 'test@aurea.com',
          nombre: 'Usuario',
          apellidos: 'de Prueba',
          activo: true,
        }
      });
      
      console.log('\n✅ Usuario creado:');
      console.log(`   📧 Email: test@aurea.com`);
      console.log(`   🔑 Contraseña: Test123!`);
      console.log(`   👤 Nombre: Usuario de Prueba`);
    }
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
