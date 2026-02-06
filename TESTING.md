# Guía de Testing - AUREA API (Migrado)

Este documento explica cómo probar el resultado de la migración completa de **aurea-1mb** (Supabase) a **aurea-api** (Fastify + Prisma).

## 🎯 Resultado de la Migración

✅ **Completado:**

- 22 modelos Prisma ([prisma/schema.prisma](prisma/schema.prisma))
- 22 rutas CRUD ([src/routes/generated/](src/routes/generated/))
- 19 Edge Functions migradas ([src/routes/ai-functions/](src/routes/ai-functions/))

## 📊 Ver Resultados de la Migración

Para explorar lo que se ha migrado sin correr el servidor:

```powershell
# Ver estadísticas completas de la migración
.\migration-stats.ps1

# Explorar schema Prisma generado
code prisma\schema.prisma

# Abrir base de datos visualmente
npx prisma studio  # http://localhost:5555

# Listar todas las rutas CRUD generadas
ls src\routes\generated\

# Listar todas las funciones AI migradas
ls src\routes\ai-functions\

# Ver detalles de un modelo específico
Get-Content src\routes\generated\expediente.routes.ts

# Ver cómo se migró una función AI
Get-Content src\routes\ai-functions\ai-analizar-tipo.routes.ts
```

**💡 Documentación completa:** [MIGRATION_SUMMARY.md](MIGRATION_SUMMARY.md)

## ⚡ Testing Rápido (Sin Infraestructura)

**¿Quieres probar las funciones AI ahora mismo sin levantar Docker/PostgreSQL?**

### Opción 1: Script PowerShell (Más rápido)

```powershell
# Test directo con Anthropic API
.\test-ai-quick.ps1
```

Este script prueba 3 funciones AI:

1. **Analizar tipo de contrato** (suministros/servicios/obras)
2. **Buscar códigos CPV** (servicios de limpieza)
3. **Detectar fraccionamiento presupuestario**

### Opción 2: Script Node.js

```bash
node test-ai-quick.mjs
```

### Opción 3: cURL directo

```bash
# Test: Analizar tipo de contrato
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{
    "model": "claude-sonnet-4-20250514",
    "max_tokens": 1024,
    "messages": [{
      "role": "user",
      "content": "Eres experto en LCSP. Analiza: Objeto: \"Suministro de vehículos\" Tipo: suministros/servicios/obras?"
    }]
  }'
```

**Ventajas del testing rápido:**

- ✅ No necesitas Docker, PostgreSQL, ni Ollama
- ✅ Verifica que las funciones AI funcionan correctamente
- ✅ Usa la misma API key que generó el código
- ✅ Respuestas en ~2-5 segundos

---

## 📋 Prerequisitos (Para Testing Completo)

1. **PostgreSQL** corriendo en `localhost:5432`
2. **Node.js 22+**
3. **(Opcional) Ollama** para funciones AI locales

## 🚀 Inicio Rápido

### 1. Configurar Base de Datos

```bash
# Opción A: Docker PostgreSQL
docker run -d \
  --name aurea-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=aurea \
  -p 5432:5432 \
  postgres:16-alpine

# Opción B: PostgreSQL existente
createdb aurea
```

### 2. Ejecutar Migraciones

```bash
cd c:\Users\hugop\Repositories\aurea-api

# Generar Prisma Client (ya hecho)
npx prisma generate

# Crear tablas en la base de datos
npx prisma migrate dev --name init

# (Opcional) Verificar tablas creadas
npx prisma studio
# Abre http://localhost:5555
```

### 3. Iniciar Servidor

```bash
# Modo desarrollo (hot-reload)
npm run dev

# Modo producción
npm run build
npm start
```

El servidor estará disponible en: **http://localhost:3000**

## 🧪 Testing de Endpoints

### Rutas CRUD Generadas

Todas las rutas CRUD están en [`src/routes/generated/`](src/routes/generated/) y siguen este patrón:

#### Ejemplo: Expedientes

```bash
# GET /expedientes - Listar todos
curl http://localhost:3000/expedientes

# GET /expedientes/:id - Obtener uno
curl http://localhost:3000/expedientes/123e4567-e89b-12d3-a456-426614174000

# POST /expedientes - Crear nuevo
curl -X POST http://localhost:3000/expedientes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "codigo": "EXP-2026-001",
    "unidad": "Unidad de Contratación",
    "organo": "Guardia Civil",
    "creadorId": "550e8400-e29b-41d4-a716-446655440000",
    "estado": "borrador",
    "tipoContrato": "servicios",
    "objeto": "Contratación de servicios de consultoría",
    "tieneLotes": false,
    "esUrgente": false,
    "esEmergencia": false
  }'

# PUT /expedientes/:id - Actualizar
curl -X PUT http://localhost:3000/expedientes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"estado": "en_tramite"}'

# DELETE /expedientes/:id - Eliminar
curl -X DELETE http://localhost:3000/expedientes/123e4567-e89b-12d3-a456-426614174000 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Otros Endpoints CRUD Disponibles

```bash
# Perfiles de usuario
GET    /profiles
GET    /profiles/:id
POST   /profiles
PUT    /profiles/:id
DELETE /profiles/:id

# Documentos

GET    /documentos
POST   /documentos
PUT    /documentos/:id
DELETE /documentos/:id

# Revisiones (auditoría)
GET    /revisiones
POST   /revisiones

# Validaciones
GET    /validaciones
POST   /validaciones

# Y 17 endpoints más... (ver src/routes/generated/)
```

### Edge Functions Migradas

Las funciones AI están en [`src/routes/ai-functions/`](src/routes/ai-functions/):

#### Ejemplo: Analizar Contrato con AI

```bash
# POST /ai-analizar-tipo - Analizar tipo de contrato
curl -X POST http://localhost:3000/ai-analizar-tipo \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \  -d '{
    "objeto": "Suministro de vehículos oficiales",
    "descripcion": "Adquisición de 50 vehículos tipo turismo para renovación de flota"
  }'

# Respuesta AI:
# {
#   "tipoContrato": "suministros",
#   "confianza": 0.95,
#   "justificacion": "Basado en LCSP art. 13.2.a..."
# }
```

#### Otras Funciones AI Disponibles

| Endpoint                           | Descripción                                              |
| ---------------------------------- | -------------------------------------------------------- |
| `POST /ai-analizar-tipo`           | Determina tipo de contrato (suministros/servicios/obras) |
| `POST /ai-analizar-presupuesto`    | Analiza fraccionamiento presupuestario                   |
| `POST /ai-analizar-cpv`            | Sugiere códigos CPV apropiados                           |
| `POST /ai-analizar-centralizacion` | Verifica si debe ser contratación centralizada           |
| `POST /ai-analizar-emergencia`     | Valida justificación de emergencia                       |
| `POST /ai-contrato`                | Genera documentación de contrato                         |
| `POST /ai-generar-documento`       | Genera documentos en Word/PDF                            |
| `POST /cpv-search`                 | Búsqueda inteligente de códigos CPV                      |
| `POST /send-welcome-email`         | Envía emails de bienvenida                               |

Ver todos en: [src/routes/ai-functions/](src/routes/ai-functions/)

## 🔐 Autenticación

Las rutas requieren JWT token. Para testing rápido:

```bash
# 1. Registrar usuario
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@guardia.civil",
    "password": "SecurePassword123!",
    "fullName": "Usuario Prueba"
  }'

# 2. Hacer login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@guardia.civil",
    "password": "SecurePassword123!"
  }'

# Respuesta:
# {
#   "accessToken": "eyJhbGciOiJIUzI1NiIs...",
#   "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
#   "expiresIn": 900
# }

# 3. Usar token en requests
export TOKEN="eyJhbGciOiJIUzI1NiIs..."
curl http://localhost:3000/expedientes \
  -H "Authorization: Bearer $TOKEN"
```

## 🐳 Docker Compose (Stack Completo)

Crea `docker-compose.yml` en la raíz:

```yaml
version: "3.8"

services:
  # PostgreSQL
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_PASSWORD: postgres
      POSTGRES_DB: aurea
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

  # Ollama (AI Local)
  ollama:
    image: ollama/ollama:latest
    ports:
      - "11434:11434"
    volumes:
      - ollama_data:/root/.ollama
    # Pull model on startup
    entrypoint: ["/bin/sh", "-c"]
    command:
      - |
        ollama serve &
        sleep 5
        ollama pull llama3.3:70b
        wait

  # Redis (Rate Limiting)
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  # MinIO (S3-compatible storage)
  minio:
    image: minio/minio:latest
    command: server /data --console-address ":9001"
    environment:
      MINIO_ROOT_USER: minioadmin
      MINIO_ROOT_PASSWORD: minioadmin
    ports:
      - "9000:9000" # API
      - "9001:9001" # Console
    volumes:
      - minio_data:/data

  # API Server (cuando esté dockerizado)
  # api:
  #   build: .
  #   ports:
  #     - "3000:3000"
  #   environment:
  #     DATABASE_URL: postgresql://postgres:postgres@postgres:5432/aurea
  #     AI_PROVIDER: ollama
  #     AI_BASE_URL: http://ollama:11434
  #   depends_on:
  #     - postgres
  #     - ollama
  #     - redis

volumes:
  postgres_data:
  ollama_data:
  minio_data:
```

Iniciar stack:

```bash
docker-compose up -d

# Verificar servicios
docker-compose ps

# Logs
docker-compose logs -f
```

## 📊 Validar Migración

### 1. Verificar Schema Prisma

```bash
# Debe mostrar 22 modelos
npx prisma validate
npx prisma format
```

### 2. Verificar Rutas Generadas

```bash
# Contar archivos
ls src/routes/generated/*.ts | wc -l
# Output: 22

ls src/routes/ai-functions/*.ts | wc -l
# Output: 19
```

### 3. Verificar Tipos TypeScript

```bash
npm run typecheck
# No debe haber errores de compilación
```

### 4. Test de Integración

```bash
# Crear archivo test/integration.test.ts
npm test
```

## 🔍 Explorar Código Generado

### Ejemplo de Ruta CRUD

Ver: [src/routes/generated/expediente.routes.ts](src/routes/generated/expediente.routes.ts)

- ✅ Validación con TypeBox
- ✅ Prisma Client integrado
- ✅ Autenticación JWT
- ✅ Paginación
- ✅ Filtros y búsqueda
- ✅ Manejo de errores

### Ejemplo de Función AI

Ver: [src/routes/ai-functions/ai-gateway.routes.ts](src/routes/ai-functions/ai-gateway.routes.ts)

- ✅ AI Gateway (provider-agnostic)
- ✅ Sustitución de variables en prompts
- ✅ Manejo de herramientas (tool calling)
- ✅ Streaming de respuestas
- ✅ Fallbacks y rate limiting

## 🎨 Swagger/OpenAPI

```bash
# Acceder a documentación interactiva
# (Cuando esté habilitado en src/index.ts)
http://localhost:3000/documentation
```

## 📈 Próximos Pasos

1. **Integrar rutas generadas** en `src/index.ts`:

   ```typescript
   // src/index.ts
   import expedienteRoutes from "./routes/generated/expediente.routes";
   import aiGatewayRoutes from "./routes/ai-functions/ai-gateway.routes";

   app.register(expedienteRoutes, { prefix: "/api" });
   app.register(aiGatewayRoutes, { prefix: "/api" });
   ```

2. **Migrar datos** de Supabase a PostgreSQL:

   ```bash
   # Exportar desde Supabase
   pg_dump <supabase-connection-string> > backup.sql

   # Importar a PostgreSQL local
   psql -U postgres -d aurea < backup.sql
   ```

3. **CI/CD**: GitHub Actions para deploy automático

4. **Monitoring**: Prometheus + Grafana

5. **Testing E2E**: Playwright o Cypress para frontend

## ❓ Troubleshooting

### Error: Connection refused (PostgreSQL)

```bash
# Verificar PostgreSQL corriendo
docker ps | grep postgres

# Reiniciar contenedor
docker restart aurea-postgres
```

### Error: Prisma Client not generated

```bash
npx prisma generate
```

### Error: Cannot find module '@prisma/client'

```bash
npm install
npx prisma generate
```

### Error AI Gateway: Model not found

```bash
# Verificar Ollama corriendo
curl http://localhost:11434/api/tags

# Pull model si no existe
ollama pull llama3.3:70b
```

## 📚 Recursos

- [Prisma Documentation](https://www.prisma.io/docs)
- [Fastify Documentation](https://www.fastify.io/)
- [LCSP (Ley Contratos Sector Público)](https://www.boe.es/buscar/act.php?id=BOE-A-2017-12902)
- [Migration Boilerplate](https://github.com/1millionbot/migration-boilerplate)

---

**¿Dudas?** Abre un issue en el repositorio o contacta al equipo de 1MillionBot.
