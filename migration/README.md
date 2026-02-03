# Lovable-to-OnPrem Migration Kit

**Boilerplate genérico** para migrar cualquier proyecto Lovable (Supabase + vibe-coding) a infraestructura on-premise con Fastify + Prisma + Docker.

> **📚 Para el caso de uso específico de AUREA**, ver [examples/EXAMPLE-MIGRATION.md](examples/EXAMPLE-MIGRATION.md)

---

## 🎯 Objetivo

Toolkit reutilizable que reduce tiempo de migración de **4+ semanas manual** a **5-7 días AI-asistidos** para cualquier proyecto Lovable.

## 🎯 AI Providers: Migración vs Producción

### Migration AI (Code Generation - Development)

- **Propósito**: Generar código backend durante el proceso de migración (una sola vez)
- **Providers**: Claude Sonnet 4.5 o Gemini 3
- **Uso**: Generación de schemas, routes, functions desde proyecto Lovable
- **Config**: `MIGRATION_AI_PROVIDER=anthropic|gemini`, `ANTHROPIC_API_KEY`, `GEMINI_API_KEY`
- **Modelos**: `claude-sonnet-4-20250514` o `gemini-2.0-flash-exp`

### Production AI (Runtime)

- **Propósito**: Funciones AI en producción del proyecto migrado (continuo)
- **Providers**: Ollama (Llama 3.3 70B), Azure OpenAI Gov, Gemini, OpenAI, Anthropic
- **Uso**: Inferencia AI en runtime para lógica de negocio
- **Config**: `AI_PROVIDER`, `AI_MODEL`, `AI_API_KEY`, `AI_BASE_URL`
- **Ubicación**: `src/services/ai-gateway/` - arquitectura provider-agnostic

**Distinción clave**: Migration AI genera código **una vez** (desarrollo), Production AI ejecuta lógica de negocio **continuamente** (runtime).

## 📦 Componentes

### 🤖 AI-Assisted Scripts (Requieren Claude/Gemini)

#### 1. AI Schema Migrator

**Ubicación:** `ai-migrators/schema-migrator.ts`  
**Provider:** Claude Sonnet 4.5 o Gemini 3  
**Comando:** `npm run migrate:schema`

Convierte migraciones SQL Supabase → Prisma schema usando IA.

**Features:**

- ENUMs PostgreSQL → Prisma enums con @map()
- JSONB → Json type
- Arrays → tipados (String[], Int[])
- Foreign keys → @relation con referencias
- RLS policies → comentarios documentados
- Índices → @@index, @@unique

#### 2. AI Route Generator

**Ubicación:** `ai-migrators/route-generator.ts`  
**Provider:** Claude Sonnet 4.5 o Gemini 3  
**Comando:** `npm run migrate:routes`

Genera endpoints CRUD Fastify desde modelos Prisma.

**Features:**

- GET /resource (list con paginación)
- GET /resource/:id (detalle)
- POST /resource (crear con validación)
- PUT /resource/:id (actualizar)
- DELETE /resource/:id (eliminar)
- AJV validation schemas
- Swagger/OpenAPI decorators
- Error handling (404, 400, 500)

#### 3. AI Function Migrator

**Ubicación:** `ai-migrators/function-migrator.ts`  
**Provider:** Claude Sonnet 4.5 o Gemini 3  
**Comando:** `npm run migrate:functions`

Convierte Edge Functions (Deno) → Fastify routes (Node.js).

**Features:**

- Deno.serve() → Fastify handlers
- Supabase Client → Prisma Client
- AI API calls → AI Gateway (provider-agnostic)
- Preserva lógica negocio (prompts, validaciones)
- Añade autenticación y Swagger docs

#### 4. AI Hook Transformer

**Ubicación:** `ai-migrators/hook-transformer.ts`  
**Provider:** Claude Sonnet 4.5 o Gemini 3  
**Comando:** `npm run migrate:hooks`

Transforma hooks React (Supabase) → REST API (fetch).

**Features:**

- supabase.from() → fetch('/api/endpoint')
- @tanstack/react-query integration
- useQuery para lecturas
- useMutation para escrituras
- Preserva estados loading/error
- TypeScript types

#### 5. AI Auth Generator

**Ubicación:** `ai-migrators/auth-generator.ts`  
**Provider:** Claude Sonnet 4.5 o Gemini 3  
**Comando:** `npm run migrate:auth`

Genera sistema de autenticación completo con soporte para múltiples proveedores.

**Features:**

- **JWT Simple**: Desarrollo y despliegues pequeños
- **Keycloak**: Enterprise/producción con SSO, LDAP/AD, MFA
- Plugin architecture (cambio por configuración)
- Decorators: @authenticate, @authorize
- Token refresh automático
- Migración de usuarios desde Supabase
- Rutas: /auth/login, /auth/refresh, /auth/logout, /auth/me

**Providers soportados:**

- JWT con bcrypt (desarrollo)
- Keycloak con OpenID Connect (producción)

**Uso:**

```bash
# Generar sistema completo
npm run migrate:auth -- --provider both --output src/auth

# Solo JWT
npm run migrate:auth -- --provider jwt

# Solo Keycloak
npm run migrate:auth -- --provider keycloak
```

---

### 🛠️ Regular Scripts (Sin IA)

#### 1. Project Inspector

**Ubicación:** `inspectors/project-inspector.ts`  
**Comando:** `npm run migrate:inspect`

Escanea proyecto Lovable extrayendo metadatos (sin IA).

**Output:** `inspection.json`

- Tablas (desde types.ts)
- Edge Functions (supabase/functions/)
- Hooks React (src/hooks/)
- Migraciones SQL completas
- Uso Storage/Realtime/Auth

#### 2. Schema Validator

**Ubicación:** `scripts/validate-schema.ts`  
**Comando:** `npm run migrate:validate`

Valida Prisma schema generado (npx prisma validate + checks).

**Checks:**

- Sintaxis Prisma correcta
- PostgreSQL provider presente
- @@map() para nombres tablas
- Índices en foreign keys
- Stats: modelos, enums, relaciones

#### 3. Type Generator

**Ubicación:** `scripts/generate-types.ts`  
**Comando:** `npm run migrate:types`

Genera Prisma Client + exports TypeScript para frontend.

**Output:**

- npx prisma generate
- src/types/generated/index.ts
- Re-exports de @prisma/client
- Helper types (PaginationParams, PaginatedResponse)

#### 4. Docker Setup

**Ubicación:** `scripts/setup-docker.ts`  
**Comando:** `npm run migrate:docker`

Genera docker-compose.yml on-premise stack.

**Services:**

- PostgreSQL 16
- Redis 7
- MinIO (S3-compatible storage)
- Keycloak (opcional, MFA)
- Mailpit (desarrollo SMTP)
- Prometheus + Grafana (opcional)

#### 5. User Migration

**Ubicación:** `scripts/migrate-users.ts`  
**Comando:** `npm run migrate:users`

Migra usuarios de Supabase Auth al nuevo sistema.

**Features:**

- Extrae users + profiles + roles de Supabase
- Genera SQL para inserción en Prisma DB
- Lista usuarios que necesitan password reset
- Preserva IDs originales
- Mantiene roles y metadatos

**Uso:**

```bash
# Requiere SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY
npm run migrate:users -- \
  --from ../lovable-project \
  --to ./prisma/schema.prisma
```

**Output:**

- `migration/output/user-migration.sql` - SQL para usuarios
- `migration/output/users-need-password-reset.txt` - Lista emails

---

## 🚀 Workflow Completo

- RLS policies → comentarios middleware

### 3. AI Route Generator

**Ubicación:** `ai-migrators/route-generator.ts`

Genera endpoints Fastify CRUD completos por tabla.

**Features:**

- Validación schemas AJV
- Queries Prisma optimizadas
- Documentación Swagger inline
- Manejo errores RESTful

### 4. AI Hook Transformer

**Ubicación:** `ai-migrators/hook-transformer.ts`

Reescribe hooks React Supabase → REST API.

**Features:**

- Preserva interfaz React Query
- Manejo errores idéntico
- Optimistic updates

### 5. AI Function Migrator

**Ubicación:** `ai-migrators/function-migrator.ts`

Convierte Edge Functions Deno → Fastify endpoints.

**Features:**

- Extrae prompts IA
- Convierte Deno → Node.js
- Adapta provider (Ollama/Azure)
- Mantiene retry logic

### 6. Supabase Bridge Layer

**Ubicación:** `../src/adapters/supabase-bridge.ts`

Drop-in replacement Supabase Client para frontend.

**Ventaja:** Frontend cambia 1 línea (import), resto funciona sin cambios.

## 🚀 Uso General (Cualquier Proyecto Lovable)

### Requisitos Previos

```bash
# Instalar dependencias
npm install

# Configurar AI para migración
export MIGRATION_AI_PROVIDER=anthropic  # o gemini
export ANTHROPIC_API_KEY=sk-ant-...     # o GEMINI_API_KEY
```

### Workflow Básico

#### 1. Inspeccionar proyecto Lovable

```bash
npm run migrate:inspect -- --source /path/to/lovable-project
```

**Output:** `migration/inspection.json` con:

- Tablas (desde types.ts)
- Edge Functions (supabase/functions/)
- React Hooks (src/hooks/)
- Migraciones SQL
- Detección Storage/Realtime/Auth

#### 2. Migrar Schema SQL → Prisma

```bash
npm run migrate:schema
```

**Output:** `prisma/schema.prisma` generado con:

- Modelos PascalCase + Entity suffix
- ENUMs mapeados
- Relaciones @relation
- Índices preservados

**Validar:**

```bash
npm run migrate:validate
```

#### 3. Generar CRUD Endpoints

```bash
npm run migrate:routes
# Opciones: --no-auth, --no-validation, --no-swagger
```

**Output:** `src/routes/generated/*.routes.ts`

- GET /resource (paginado)
- GET /resource/:id
- POST /resource (validado)
- PUT /resource/:id
- DELETE /resource/:id

#### 4. Migrar Edge Functions (Opcional)

```bash
npm run migrate:functions --ai-provider=ollama
```

**Output:** `src/routes/ai-functions/*.routes.ts`

- Deno → Node.js
- Supabase Client → Prisma
- AI calls → AI Gateway

#### 5. Transformar React Hooks (Opcional)

```bash
npm run migrate:hooks
# Opciones: --no-tanstack
```

**Output:** `src/hooks/generated/*.ts`

- supabase.from() → fetch()
- @tanstack/react-query integration
- Preserva estados loading/error

#### 6. Setup Docker On-Premise

```bash
npm run migrate:docker
# Opciones: --no-keycloak, --no-minio, --prometheus
```

**Output:** `docker/docker-compose.yml` con:

- PostgreSQL 16
- Redis 7
- MinIO (S3)
- Keycloak (opcional)
- Mailpit (dev)

---

## 🤖 Configuración IA

### Para Migración (Code Generation)

```bash
# Claude Sonnet 4.5 (recomendado)
MIGRATION_AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=sk-ant-...

# O Gemini 3 (alternativa)
MIGRATION_AI_PROVIDER=gemini
GEMINI_API_KEY=AIza...
```

### Para Producción (Runtime del proyecto migrado)

```bash
# Ver .env.example para configuración completa
AI_PROVIDER=ollama  # ollama, azure-openai, gemini, openai, anthropic
AI_MODEL=llama3.3:70b
AI_BASE_URL=http://localhost:11434
```

---

## 📋 Checklist Migración Genérica

- [ ] Fork/clone boilerplate-api base
- [ ] Configurar MIGRATION_AI_PROVIDER + API keys
- [ ] Inspeccionar proyecto Lovable (`migrate:inspect`)
- [ ] Revisar `inspection.json` validando detección
- [ ] Migrar schema (`migrate:schema`) + validar
- [ ] Generar rutas CRUD (`migrate:routes`)
- [ ] Migrar Edge Functions si existen (`migrate:functions`)
- [ ] Transformar hooks frontend si necesario (`migrate:hooks`)
- [ ] Configurar AI Gateway producción (AI_PROVIDER)
- [ ] Setup Docker (`migrate:docker`)
- [ ] Testing endpoints vs Supabase original
- [ ] Deployment

---

## 🔧 Personalización y Extensión

### Añadir Inspector Personalizado

```typescript
// migration/inspectors/custom-feature-inspector.ts
export async function inspectCustomFeature(projectPath: string) {
  // Escanear archivos específicos
  // Extraer metadatos
  return { featureData: [...] };
}
```

Integrar en `project-inspector.ts`:

```typescript
import { inspectCustomFeature } from "./custom-feature-inspector.js";

const inspection = {
  // ... campos existentes
  customFeature: await inspectCustomFeature(projectPath),
};
```

### Modificar Prompts IA

Editar archivos en `migration/prompts/`:

- `schema-migrator.md` - Reglas conversión SQL→Prisma
- Crear nuevos prompts para casos específicos

### Crear Templates Adicionales

```typescript
// migration/templates/custom-template.ts
export function generateCustomCode(data: InspectionData): string {
  return `
    // Código generado basado en ${data.projectName}
  `;
}
```

---

## 📚 Documentación Extendida

- **Caso de Uso Real**: [examples/EXAMPLE-MIGRATION.md](examples/EXAMPLE-MIGRATION.md)
- **Troubleshooting**: Errores comunes y soluciones
- **Advanced**: Customización avanzada del kit

---

## 🎓 Casos de Uso

Este kit ha sido probado con:

- **AUREA** (Guardia Civil): 30 tablas, 17 Edge Functions, 18 hooks → Ver [examples/EXAMPLE-MIGRATION.md](examples/EXAMPLE-MIGRATION.md)
- Proyectos Lovable pequeños (~5-10 tablas)
- Proyectos con AI intensiva (múltiples Edge Functions)

---

## 🤝 Contribuir

PRs bienvenidos para:

- ✅ Nuevos inspectores (Realtime, OAuth providers, custom Supabase features)
- ✅ Mejoras prompts IA (mejor conversión código)
- ✅ Templates adicionales (GraphQL, tRPC, etc.)
- ✅ Validaciones automáticas
- ✅ Soporte otros ORMs (TypeORM, Drizzle)

---

## 📄 Licencia

MIT - Reutilizable para cualquier proyecto comercial/open-source.

## 📝 Licencia

ISC - 1MillionBot
