# Migration Plan: Lovable to On-Premise

This document provides a **step-by-step, repeatable playbook** for migrating any Lovable (Vibe Coding + Supabase) project to on-premise infrastructure using the Migration Kit.

## Executive Summary

### Migration Phases Overview

This plan addresses all required phases for Vibe Coding → On-Premise migration:

| Required Phase                           | Implementation in Plan                | Status |
| ---------------------------------------- | ------------------------------------- | ------ |
| **1. Contenerizar proyecto actual**      | Phase 8: Docker Deployment            | ✅     |
| **2. Desplegar en GC propio**            | Phase 8: Docker + Phase 9: Production | ✅     |
| **3. Sustituir servicios no on-premise** | Phase 4: Auth + Phase 6: AI Functions | ✅     |
| **4. Ajustar persistencia**              | Phase 3: Schema + Phase 5: Database   | ✅     |

### Timeline & Effort

| Metric                 | Value                             |
| ---------------------- | --------------------------------- |
| **Total Duration**     | 5-7 days (with buffer: 8-10 days) |
| **Manual Alternative** | 4+ weeks                          |
| **Time Savings**       | 70-80%                            |
| **Complexity**         | Medium (⭐⭐)                     |

### Success Metrics

- ✅ **Feature Parity**: 100% functionality preserved
- ✅ **Data Integrity**: Zero data loss, verified checksums
- ✅ **Performance**: ≤20% degradation vs Supabase (acceptable for on-premise)
- ✅ **Security**: ENS Alto compliant (Keycloak + MFA)
- ✅ **Maintainability**: Team can extend without external help

### Reusability Validation

**✅ Project-Agnostic**: Works for ANY Lovable project, not just AUREA

- E-commerce, SaaS, CMS, CRM, Task Managers
- Only business logic is project-specific
- 95% of kit is reusable across projects

---

## Prerequisites

- Node.js 22 or higher
- Git
- Visual Studio Code
- Docker and Docker Compose (for deployment)
- API key for Claude Sonnet 4.5 or Gemini 2.0 Flash (for AI-assisted scripts)

## Phase 1: Initial Setup

### Step 1: Obtain the Lovable Project

Ensure you have access to the complete Lovable project source code.

```bash
# Clone the Lovable project (if in Git)
git clone <lovable-project-url> project-name-lovable
cd project-name-lovable

# Verify structure
ls -la
# Should contain: src/, supabase/, package.json, etc.
```

Expected structure:

```
project-name-lovable/
├── src/
│   ├── components/
│   ├── hooks/
│   ├── pages/
│   └── integrations/
│       └── supabase/
│           └── types.ts
├── supabase/
│   ├── functions/
│   └── migrations/
├── package.json
└── ...
```

### Step 2: Create API Repository from Boilerplate

```bash
# Navigate to parent directory
cd ..

# Clone boilerplate-api repository
git clone https://github.com/1millionbot/boilerplate-api.git project-name-api
cd project-name-api

# Remove existing Git history and initialize fresh repository
rm -rf .git
git init
git add .
git commit -m "Initial commit: boilerplate-api base"

# Create remote repository and push
git remote add origin <your-api-repo-url>
git push -u origin main
```

### Step 3: Configure VSCode Workspace

Create a multi-root workspace to work with both projects simultaneously.

**Option A: Create workspace file manually**

Create `project-name.code-workspace`:

```json
{
  "folders": [
    {
      "name": "Frontend (Lovable)",
      "path": "../project-name-lovable"
    },
    {
      "name": "Backend (API)",
      "path": "../project-name-api"
    }
  ],
  "settings": {
    "files.exclude": {
      "**/node_modules": true,
      "**/.git": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true
    }
  }
}
```

**Option B: Using VSCode command**

1. Open VSCode
2. File → Add Folder to Workspace → Select `project-name-lovable`
3. File → Add Folder to Workspace → Select `project-name-api`
4. File → Save Workspace As → `project-name.code-workspace`

### Step 4: Install Dependencies

```bash
# In project-name-api directory
cd project-name-api
npm install

# Verify migration scripts are available
npm run migrate:inspect
# Should show available scripts
```

## Phase 2: Configuration

### Step 5: Configure Environment Variables

Create `.env.development` in the API project:

```bash
cd project-name-api
cp .env.example .env.development
```

Edit `.env.development`:

```env
# Database
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/project_name"

# Migration AI (for code generation - one-time use)
MIGRATION_AI_PROVIDER="anthropic"  # or "gemini"
ANTHROPIC_API_KEY="sk-ant-api03-..."
# GEMINI_API_KEY="..."  # Alternative

# Production AI (for runtime - after migration)
AI_PROVIDER="ollama"
AI_MODEL="llama-3.3-70b"
AI_BASE_URL="http://localhost:11434"

# JWT
JWT_SECRET="your-secure-random-secret-change-in-production"
JWT_EXPIRES_IN="7d"

# Server
PORT=3000
NODE_ENV="development"
```

### Step 6: Verify Project Paths

Ensure the paths are correct for the inspector script.

In `project-name-api/package.json`, verify migration scripts point to correct paths:

```json
{
  "scripts": {
    "migrate:inspect": "tsx migration/inspectors/project-inspector.ts",
    "migrate:schema": "tsx migration/ai-migrators/schema-migrator.ts",
    "migrate:routes": "tsx migration/ai-migrators/route-generator.ts",
    "migrate:functions": "tsx migration/ai-migrators/function-migrator.ts",
    "migrate:hooks": "tsx migration/ai-migrators/hook-transformer.ts"
  }
}
```

## Phase 3: Migration Execution

### Step 7: Run Project Inspector

This script analyzes the Lovable project and generates metadata (no AI required).

```bash
cd project-name-api

# Run inspector pointing to Lovable project
npx tsx migration/inspectors/project-inspector.ts \
  ../project-name-lovable \
  migration/output/inspection.json

# Verify output
cat migration/output/inspection.json | head -50
```

Expected output:

```
🔍 Inspecting project: ../project-name-lovable
   📋 Detected N tables
   ⚡ Detected M edge functions
   🪝 Detected K hooks
   📄 Detected X SQL migrations
✅ Inspection completed
```

Review `inspection.json` to verify detection:

- Check table count matches expected
- Verify edge functions detected
- Confirm hooks identified
- SQL migrations found

### Step 8: Generate Prisma Schema

This script uses AI to convert SQL migrations to Prisma schema.

```bash
# Ensure ANTHROPIC_API_KEY or GEMINI_API_KEY is set
npm run migrate:schema

# Or run directly with custom paths
npx tsx migration/ai-migrators/schema-migrator.ts \
  --input migration/output/inspection.json \
  --output prisma/schema.prisma
```

Expected output:

```
🤖 Migrating schema with AI (model: claude-sonnet-4-20250514)...
📄 Processing X characters SQL...
✅ Prisma schema generated: prisma/schema.prisma
```

**Verify generated schema:**

```bash
# Check schema syntax
npx prisma validate

# Review schema content
cat prisma/schema.prisma
```

Common issues:

- Missing enums: Check SQL migrations for CREATE TYPE statements
- Incorrect relations: Review foreign key mappings
- Type mismatches: Verify PostgreSQL to Prisma type conversions

### Step 9: Validate Schema

```bash
npm run migrate:validate
```

Expected checks:

- Prisma syntax validation
- Model count verification
- Index detection
- Relation completeness

Fix any warnings or errors before proceeding.

### Step 10: Generate CRUD Routes

This script uses AI to generate Fastify routes from Prisma models.

```bash
npm run migrate:routes

# Or specify custom output
npx tsx migration/ai-migrators/route-generator.ts \
  --schema prisma/schema.prisma \
  --output src/routes
```

Expected output:

```
🤖 Generating routes with AI...
✅ Generated src/routes/expedientes.ts
✅ Generated src/routes/documentos.ts
✅ Generated src/routes/validaciones.ts
...
📊 Total: N route files created
```

**Verify generated routes:**

```bash
# List generated files
ls -la src/routes/

# Review a sample route
cat src/routes/expedientes.ts
```

Check:

- All CRUD operations present (GET, POST, PUT, DELETE)
- Proper TypeBox validation
- Error handling implemented
- Authentication middleware included

### Step 11: Migrate Edge Functions

This script converts Supabase Edge Functions (Deno) to Node.js services.

```bash
npm run migrate:functions

# Or specify paths
npx tsx migration/ai-migrators/function-migrator.ts \
  --input ../project-name-lovable/supabase/functions \
  --output src/services
```

Expected output:

```
🤖 Migrating edge functions with AI...
✅ Migrated ai-gateway → src/services/ai-gateway.ts
✅ Migrated admin-create-user → src/services/admin/create-user.ts
...
📊 Total: M services created
```

**Review critical services:**

```bash
# Check AI functions
cat src/services/ai-gateway.ts

# Check business logic preserved
cat src/services/admin/create-user.ts
```

Verify:

- Deno imports removed
- Supabase client replaced with Prisma
- AI calls use AI Gateway
- Authentication implemented

### Step 12: Transform React Hooks

This script generates documentation for migrating frontend hooks.

```bash
npm run migrate:hooks
```

Expected output:

```
📝 Analyzing hooks...
✅ Generated migration guide: migration/output/hooks-migration.md
📊 Total: K hooks documented
```

**Review migration guide:**

```bash
cat migration/output/hooks-migration.md
```

This document contains:

- Hook-by-hook transformation examples
- Supabase → fetch API patterns
- Authentication token handling
- Error handling updates

Note: Frontend hooks must be manually updated in the Lovable project.

## Phase 4: Authentication Strategy

### Step 13: Choose Authentication Provider

The Migration Kit supports two authentication strategies:

**JWT Simple (Recommended for Development)**

- Fast setup
- No external dependencies
- Good for POCs and small deployments

**Keycloak (Recommended for Production/Enterprise)**

- Enterprise-grade IAM
- SSO (Single Sign-On)
- LDAP/Active Directory integration
- Multi-Factor Authentication (MFA)
- Complete audit trail for compliance (ENS Alto, GDPR)
- Centralized user management
- Identity federation (Cl@ve, external providers)

**Decision Matrix:**

| Use Case                     | Recommended Provider |
| ---------------------------- | -------------------- |
| Development/Testing          | JWT Simple           |
| POC/MVP                      | JWT Simple           |
| Government/Enterprise        | Keycloak             |
| LDAP/AD Integration Required | Keycloak             |
| SSO Required                 | Keycloak             |
| ENS Alto Compliance          | Keycloak             |

Configure in `.env.development`:

```env
# For JWT Simple
AUTH_PROVIDER=jwt
JWT_SECRET=your-secure-random-secret-change-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=aurea-api
JWT_AUDIENCE=aurea-client

# For Keycloak
AUTH_PROVIDER=keycloak
KEYCLOAK_URL=https://keycloak.example.com/auth
KEYCLOAK_REALM=aurea
KEYCLOAK_CLIENT_ID=aurea-api
KEYCLOAK_CLIENT_SECRET=your-client-secret
```

### Step 13a: Generate Authentication System

Generate the authentication provider system:

```bash
npm run migrate:auth

# Or run directly
npx tsx migration/ai-migrators/auth-generator.ts \
  --provider jwt \
  --output src/auth
```

This generates:

- `src/auth/index.ts` - Main auth plugin
- `src/auth/types.ts` - Type definitions
- `src/auth/providers/base.provider.ts` - Abstract base
- `src/auth/providers/jwt.provider.ts` - JWT implementation
- `src/auth/providers/keycloak.provider.ts` - Keycloak implementation
- `src/auth/decorators/authenticate.ts` - Auth middleware
- `src/auth/decorators/authorize.ts` - Authorization middleware
- `src/routes/auth.routes.ts` - Auth endpoints

Expected output:

```
🔐 Generating authentication system...
✅ Generated src/auth/index.ts
✅ Generated src/auth/types.ts
✅ Generated src/auth/providers/jwt.provider.ts
✅ Generated src/auth/providers/keycloak.provider.ts
✅ Generated src/auth/decorators/authenticate.ts
✅ Generated src/routes/auth.routes.ts
📊 Authentication system ready
```

### Step 13b: Setup Keycloak (If Selected)

If using Keycloak, set up the server:

```bash
# Create docker-compose-keycloak.yml
cat > docker-compose-keycloak.yml << 'EOF'
version: '3.8'

services:
  postgres-keycloak:
    image: postgres:16-alpine
    environment:
      POSTGRES_DB: keycloak
      POSTGRES_USER: keycloak
      POSTGRES_PASSWORD: keycloak
    volumes:
      - keycloak-postgres-data:/var/lib/postgresql/data
    networks:
      - keycloak-network

  keycloak:
    image: quay.io/keycloak/keycloak:23.0
    command: start-dev
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres-keycloak:5432/keycloak
      KC_DB_USERNAME: keycloak
      KC_DB_PASSWORD: keycloak
      KC_HOSTNAME: localhost
      KC_HOSTNAME_PORT: 8080
      KC_HOSTNAME_STRICT: false
      KC_HOSTNAME_STRICT_HTTPS: false
      KEYCLOAK_ADMIN: admin
      KEYCLOAK_ADMIN_PASSWORD: admin
    ports:
      - 8080:8080
    depends_on:
      - postgres-keycloak
    networks:
      - keycloak-network

volumes:
  keycloak-postgres-data:

networks:
  keycloak-network:
    driver: bridge
EOF

# Start Keycloak
docker-compose -f docker-compose-keycloak.yml up -d

# Wait for startup (about 30 seconds)
echo "Waiting for Keycloak to start..."
sleep 30

# Access admin console
# http://localhost:8080
# Username: admin
# Password: admin
```

**Configure Keycloak Realm:**

1. Create Realm: `aurea`
2. Create Client:
   - Client ID: `aurea-api`
   - Client Protocol: `openid-connect`
   - Access Type: `confidential`
   - Valid Redirect URIs: `http://localhost:3000/*`
3. Create Roles:
   - `admin`
   - `jefe`
   - `tecnico`
   - `consultor`
4. (Optional) Configure LDAP/AD User Federation

### Step 13c: Migrate Supabase Users

Migrate existing users from Supabase to new auth system:

```bash
# Generate user migration script
npm run migrate:users

# Or run directly
npx tsx migration/scripts/migrate-users.ts \
  --from ../project-name-lovable \
  --to ./prisma/schema.prisma
```

This script:

1. Extracts users from Supabase project
2. Reads profiles and roles
3. Generates SQL for User table inserts
4. Sends password reset emails (users must create new passwords)

Output: `migration/output/user-migration.sql`

```bash
# Review migration SQL
cat migration/output/user-migration.sql

# Apply to database (after Step 14)
psql $DATABASE_URL -f migration/output/user-migration.sql
```

### Step 13d: Test Authentication

```bash
# Start API server
npm run dev

# Test login (JWT)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password123"
  }'

# Response:
# {
#   "accessToken": "eyJhbGc...",
#   "refreshToken": "550e8400-e29b-41d4-a716-446655440000",
#   "expiresIn": 86400,
#   "tokenType": "Bearer"
# }

# Test protected endpoint
TOKEN="<access-token-from-above>"
curl http://localhost:3000/auth/me \
  -H "Authorization: Bearer $TOKEN"

# Test token refresh
REFRESH_TOKEN="<refresh-token-from-login>"
curl -X POST http://localhost:3000/auth/refresh \
  -H "Content-Type: application/json" \
  -d "{\"refreshToken\": \"$REFRESH_TOKEN\"}"
```

## Phase 5: Database Setup

### Step 14: Start PostgreSQL

```bash
# Using Docker
docker run -d \
  --name project-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=project_name \
  -p 5432:5432 \
  postgres:16-alpine

# Verify running
docker ps | grep project-postgres
```

### Step 15: Run Prisma Migrations

```bash
# Generate Prisma Client
npx prisma generate

# Create migration from schema
npx prisma migrate dev --name initial_schema

# Verify tables created
npx prisma studio
# Opens browser at http://localhost:5555
```

### Step 16: Seed Database (Optional)

If the Lovable project has seed data:

```bash
# Create seed script
cat > prisma/seed.ts << 'EOF'
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Add your seed data here
  console.log('Seeding database...');

  // Example:
  // await prisma.profile.create({
  //   data: { ... }
  // });
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
EOF

# Run seed
npm run db:seed
```

## Phase 6: Testing and Validation

### Step 17: Start API Server

```bash
# Development mode with hot-reload
npm run dev

# Check server started
curl http://localhost:3000/health
```

Expected response:

```json
{
  "status": "ok",
  "timestamp": "2026-02-03T10:30:00.000Z"
}
```

### Step 18: Test CRUD Endpoints

```bash
# Test authentication (if implemented)
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "password"}'

# Save token
TOKEN="<returned-jwt-token>"

# Test list endpoint
curl http://localhost:3000/api/expedientes \
  -H "Authorization: Bearer $TOKEN"

# Test create
curl -X POST http://localhost:3000/api/expedientes \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"codigo": "EXP-001", "objeto": "Test", ...}'

# Test get by ID
curl http://localhost:3000/api/expedientes/<id> \
  -H "Authorization: Bearer $TOKEN"

# Test update
curl -X PUT http://localhost:3000/api/expedientes/<id> \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"estado": "validado"}'

# Test delete
curl -X DELETE http://localhost:3000/api/expedientes/<id> \
  -H "Authorization: Bearer $TOKEN"
```

### Step 19: Validate AI Functions

Test AI-powered endpoints:

```bash
# Test AI gateway
curl -X POST http://localhost:3000/api/ai/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"text": "Analyze this content", "model": "llama-3.3-70b"}'
```

Note: Requires Ollama running locally with models installed.

### Step 20: Review Logs and Errors

```bash
# Check application logs
tail -f logs/app.log

# Check for errors
grep ERROR logs/app.log

# Monitor performance
grep "took" logs/app.log | tail -20
```

## Phase 7: Frontend Migration

### Step 21: Update Frontend Configuration

> **Refactoring Strategy**:

#### The Problems with Vibe Coding

Projects generated by AI (Lovable/Vibe) often suffer from:

1.  **Logic Leaks**: Business logic inside UI components.
2.  **Direct Database Access**: Components querying Supabase directly.
3.  **Spaghetti Code**: Large components (500+ lines) handling too many responsibilities.
4.  **Hardcoded Values**: Magic strings and lack of constants.
5.  **Weak Typing**: Excessive use of `any` or inferred types from DB that leak into UI.

#### The "Hybrid Refactor" Strategy

Instead of a full rewrite (costly) or keeping it as-is (technical debt), we apply a **Layered Refactoring**:

**1. What we KEEP (The Shell)**

- **UI System**: `shadcn/ui` components in `src/components/ui` are excellent. Keep them.
- **Routing**: `react-router` structure in `App.tsx`.
- **Layouts**: General page structure.
- **Styling**: TailwindCSS classes.

**2. What we REFACTOR (The Core)**

- **Data Access**: Replace direct Supabase calls with **Custom Hooks**.
- **State Management**: Lift state from components to Context or Stores (Zustand) if complex.
- **Types**: Replace Supabase database types with **API Contracts (DTOs)**.

**3. What we REWRITE (The Logic)**

- **Business Logic**: Extract calculations/rules from `useEffect` into Utility functions.
- **Form Handling**: Standardize on `react-hook-form` + `zod`.

#### Refactoring Rules (The "300 Line Rule")

Any component over 300 lines must be split:

- `Page.tsx`: Data fetching, layout, passing props.
- `FeatureList.tsx`: Iterating over data.
- `FeatureItem.tsx`: Rendering individual items.
- `FeatureForm.tsx`: Handling input.

#### Directory Structure Goal

```
src/
  features/         # Organize by Domain (DDD)
    auth/
      components/
      hooks/
      utils/
    expedientes/
      components/
      hooks/
      types.ts
```

In the Lovable project, update API configuration:

```typescript
// src/config/api.ts
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://localhost:3000";
export const API_TIMEOUT = 30000;
```

Create `.env.local`:

```env
VITE_API_URL=http://localhost:3000
```

### Step 21a: Run AI Component Refactorer (Recommended)

Instead of manually refactoring, use the automated agent to split "fat components" into Clean Architecture (Hook + Component + Types).

```bash
# Refactor all pages
npm run migrate:frontend -- "../project-name-lovable/src/pages/*.tsx"

# Refactor specific critical component
npm run migrate:frontend -- "../project-name-lovable/src/components/ExpedientesTable.tsx"
```

This script:

1. Reads the component code
2. Extracts business logic to `useFeature.ts`
3. Separates types to `types.ts`
4. Removes Supabase imports
5. Saves files to `src/features/<feature_name>/`

### Step 22: Update React Hooks

Follow the migration guide generated in Step 12.

Example transformation:

**Before (Supabase):**

```typescript
// src/hooks/useExpedientes.ts
import { supabase } from "@/integrations/supabase/client";

export function useExpedientes() {
  return useQuery({
    queryKey: ["expedientes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("expedientes").select("*");
      if (error) throw error;
      return data;
    },
  });
}
```

**After (REST API):**

```typescript
// src/hooks/useExpedientes.ts
import { fetchAPI } from "@/lib/api";

export function useExpedientes() {
  return useQuery({
    queryKey: ["expedientes"],
    queryFn: async () => {
      const response = await fetchAPI("/api/expedientes");
      return response.data;
    },
  });
}
```

Create API helper:

```typescript
// src/lib/api.ts
const API_URL = import.meta.env.VITE_API_URL;

export async function fetchAPI(endpoint: string, options?: RequestInit) {
  const token = localStorage.getItem("auth_token");

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: token ? `Bearer ${token}` : "",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Request failed");
  }

  return response.json();
}
```

### Step 23: Update Authentication

Replace Supabase Auth with custom JWT:

```typescript
// src/contexts/AuthContext.tsx
import { fetchAPI } from "@/lib/api";

export function AuthProvider({ children }) {
  const login = async (email: string, password: string) => {
    const response = await fetchAPI("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    localStorage.setItem("auth_token", response.token);
    localStorage.setItem("user", JSON.stringify(response.user));
  };

  const logout = () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
  };

  // ...
}
```

### Step 24: Test Frontend Integration

```bash
# In Lovable project directory
npm run dev

# Open browser at http://localhost:5173 (or configured port)
```

Test:

1. Login functionality
2. List views with pagination
3. Create operations
4. Update operations
5. Delete operations
6. AI-powered features

## Phase 8: Docker Deployment

### Step 25: Generate Docker Configuration

```bash
cd project-name-api
npm run migrate:docker
```

This creates:

- `docker-compose.yml`
- `Dockerfile`
- `.dockerignore`

### Step 26: Build and Run Containers

```bash
# Build images
docker-compose build

# Start all services
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f api
```

Services running:

- PostgreSQL (port 5432)
- Redis (port 6379)
- MinIO (ports 9000, 9001)
- API (port 3000)
- Ollama (port 11434)

### Step 27: Run Migrations in Docker

```bash
# Run Prisma migrations
docker-compose exec api npx prisma migrate deploy

# Generate Prisma client
docker-compose exec api npx prisma generate

# Seed database (if needed)
docker-compose exec api npm run db:seed
```

### Step 28: Production Deployment

```bash
# Build production image
docker build -t project-name-api:1.0.0 .

# Tag for registry
docker tag project-name-api:1.0.0 registry.example.com/project-name-api:1.0.0

# Push to registry
docker push registry.example.com/project-name-api:1.0.0

# Deploy to production environment (example: Docker Swarm, Kubernetes, etc.)
```

## Phase 9: Verification and Handoff

### Step 29: Security Checklist

- [ ] Environment variables properly configured
- [ ] JWT secrets changed from defaults
- [ ] Database credentials secured
- [ ] API rate limiting configured
- [ ] CORS properly configured
- [ ] HTTPS enabled in production
- [ ] Audit logs functional
- [ ] Backup strategy implemented

### Step 30: Performance Testing

```bash
# Install Apache Bench or similar
apt-get install apache2-utils

# Test endpoint performance
ab -n 1000 -c 10 \
  -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/expedientes

# Review results
# - Requests per second
# - Time per request
# - Failed requests
```

### Step 31: Documentation Update

Create project-specific documentation:

1. **API Documentation**: Export from Swagger UI
   - Visit `http://localhost:3000/documentation`
   - Download OpenAPI spec

2. **Deployment Guide**: Document production setup

3. **Environment Variables**: List all required variables

4. **Backup Procedures**: Database and file storage

5. **Monitoring Setup**: Logs, metrics, alerts

## Troubleshooting

### Common Issues

**Inspector not detecting tables:**

- Verify `src/integrations/supabase/types.ts` exists in Lovable project
- Check file format matches expected structure

**AI script fails with API error:**

- Verify API key is correctly set in `.env.development`
- Check API quota/limits not exceeded
- Try alternative provider (Gemini if Claude fails)

**Prisma migration fails:**

- Check database connection string
- Verify PostgreSQL is running
- Review schema for syntax errors

**Routes not working:**

- Ensure Prisma Client generated: `npx prisma generate`
- Check route files imported in main server file
- Verify authentication middleware configured

**Frontend can't connect to API:**

- Check CORS configuration in Fastify
- Verify API URL in frontend `.env.local`
- Check network/firewall rules

**Docker containers won't start:**

- Check port conflicts: `netstat -tulpn | grep LISTEN`
- Review Docker logs: `docker-compose logs`
- Verify volume permissions

## Timeline Estimate & Success Criteria

### Effort Estimation

For a typical Lovable project (20-30 tables, 15-20 Edge Functions):

| Phase                                 | Duration  | Effort (hours) | Complexity |
| ------------------------------------- | --------- | -------------- | ---------- |
| **Phase 1-2** (Setup & Configuration) | 2-3 hours | Low            | ⭐         |
| **Phase 3** (Migration Execution)     | 4-6 hours | Medium         | ⭐⭐       |
| **Phase 4** (Authentication Strategy) | 3-4 hours | Medium         | ⭐⭐       |
| **Phase 5** (Database Setup)          | 1-2 hours | Low            | ⭐         |
| **Phase 6** (Testing)                 | 2-3 hours | Medium         | ⭐⭐       |
| **Phase 7** (Frontend Migration)      | 6-8 hours | High           | ⭐⭐⭐     |
| **Phase 8** (Docker Deployment)       | 2-3 hours | Medium         | ⭐⭐       |
| **Phase 9** (Verification)            | 2-4 hours | Medium         | ⭐⭐       |

**Total**: 5-7 days (includes testing, debugging, and optimization)

**Compare to manual migration**: 4+ weeks

### Success Criteria by Phase

#### Phase 1-2: Initial Setup ✅

- [ ] Lovable project accessible and analyzed
- [ ] API repository created from boilerplate
- [ ] VSCode workspace configured
- [ ] Dependencies installed successfully
- [ ] Environment variables configured

**Validation**: `npm run migrate:inspect` executes without errors

---

#### Phase 3: Migration Execution ✅

- [ ] Prisma schema generated and validated
- [ ] All tables detected (match inspection.json count)
- [ ] CRUD routes created for all models
- [ ] Edge functions converted to services
- [ ] Hooks migration guide generated

**Validation**:

- `npx prisma validate` passes
- All route files compile without errors
- Business logic preserved in services

---

#### Phase 4: Authentication Strategy ✅

- [ ] Auth provider selected (JWT or Keycloak)
- [ ] Authentication system generated
- [ ] Users migrated from Supabase
- [ ] Login/logout endpoints working
- [ ] Token refresh functional
- [ ] Role-based authorization tested

**Validation**:

- `curl POST /auth/login` returns valid token
- Protected endpoints reject unauthenticated requests
- Role checks work correctly

---

#### Phase 5: Database Setup ✅

- [ ] PostgreSQL running (Docker or local)
- [ ] Prisma migrations applied
- [ ] Seed data imported (if applicable)
- [ ] Database accessible via Prisma Studio
- [ ] All relations working

**Validation**:

- `npx prisma migrate status` shows all applied
- Prisma Studio shows correct data structure

---

#### Phase 6: Testing and Validation ✅

- [ ] API server starts without errors
- [ ] Health endpoint returns 200
- [ ] All CRUD operations tested
- [ ] AI functions working with Ollama
- [ ] No critical errors in logs

**Validation**:

- All manual curl tests pass
- Postman/Insomnia collection succeeds
- Load testing shows acceptable performance

---

#### Phase 7: Frontend Migration ✅

- [ ] API configuration updated
- [ ] All hooks migrated to REST API
- [ ] Authentication context updated
- [ ] UI functional and responsive
- [ ] No console errors
- [ ] Feature parity with Lovable version

**Validation**:

- End-to-end user flows complete successfully
- All features from Lovable working

---

#### Phase 8: Docker Deployment ✅

- [ ] Docker Compose configuration generated
- [ ] All containers start successfully
- [ ] Services communicate correctly
- [ ] Data persists across restarts
- [ ] Logs accessible and readable

**Validation**:

- `docker-compose ps` shows all services healthy
- API accessible from host machine

---

#### Phase 9: Verification and Handoff ✅

- [ ] Security checklist completed
- [ ] Performance benchmarks passed
- [ ] Documentation updated
- [ ] Backup strategy implemented
- [ ] Monitoring configured
- [ ] Team trained on new system

**Validation**:

- Production deployment successful
- System stable for 48+ hours
- Team can maintain and extend system

---

## Risk Assessment & Mitigation

### High-Risk Areas

#### 1. Data Loss During Migration

**Risk Level**: 🔴 HIGH

**Description**: Data could be lost or corrupted during database migration

**Mitigation**:

- Full backup before migration
- Test migration on copy first
- Verify data integrity after migration
- Keep Supabase active until confirmed success
- Document rollback procedure

**Contingency**: Restore from Supabase backup

---

#### 2. Breaking Changes in Business Logic

**Risk Level**: 🟡 MEDIUM

**Description**: Edge function conversion may introduce bugs

**Mitigation**:

- Extensive testing of converted functions
- Side-by-side comparison (Lovable vs migrated)
- Unit tests for critical business logic
- Integration tests for AI functions
- Gradual rollout with feature flags

**Contingency**: Rollback to Lovable, fix issues, re-migrate

---

#### 3. Authentication System Failure

**Risk Level**: 🟡 MEDIUM

**Description**: Users unable to login after migration

**Mitigation**:

- Thorough testing of auth flows
- Password reset mechanism ready
- User communication plan
- Admin backdoor for emergency access
- Session migration strategy

**Contingency**: Emergency password reset for all users

---

#### 4. Performance Degradation

**Risk Level**: 🟡 MEDIUM

**Description**: On-premise slower than Supabase

**Mitigation**:

- Load testing before go-live
- Database query optimization
- Proper indexing strategy
- Caching layer (Redis)
- CDN for static assets

**Contingency**: Scale infrastructure, optimize queries

---

#### 5. Docker/Infrastructure Issues

**Risk Level**: 🟢 LOW

**Description**: Containers fail to start or communicate

**Mitigation**:

- Test Docker setup locally first
- Document all environment variables
- Health checks for all services
- Automated restart policies
- Monitoring and alerts

**Contingency**: Troubleshooting guide in documentation

---

#### 6. Frontend API Integration Failures

**Risk Level**: 🟡 MEDIUM

**Description**: Frontend can't communicate with new API

**Mitigation**:

- CORS properly configured
- Comprehensive integration tests
- Error handling in API client
- Graceful degradation
- Feature flags for phased rollout

**Contingency**: API compatibility layer

---

### Risk Summary Table

| Risk            | Probability | Impact   | Priority | Mitigation Time |
| --------------- | ----------- | -------- | -------- | --------------- |
| Data Loss       | Low         | Critical | P0       | 2 hours         |
| Logic Bugs      | Medium      | High     | P1       | 4 hours         |
| Auth Failure    | Low         | High     | P1       | 2 hours         |
| Performance     | Medium      | Medium   | P2       | 6 hours         |
| Infrastructure  | Low         | Medium   | P2       | 3 hours         |
| Frontend Issues | Medium      | Medium   | P2       | 4 hours         |

**Total Risk Mitigation Buffer**: Add 21 hours to timeline (3 days)

**Recommended Timeline with Buffer**: 8-10 days

---

## Lovable Migration Patterns

### Common Patterns Across All Lovable Projects

These patterns appear consistently and the Migration Kit handles them:

#### 1. Database Patterns

**Pattern**: Supabase types.ts structure

```typescript
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
```

**Solution**: Inspector extracts via regex `(\w+):\s*\{\s*Row:`

---

**Pattern**: RLS policies everywhere

```sql
CREATE POLICY "users_select_own" ON profiles
  FOR SELECT USING (auth.uid() = id);
```

**Solution**: Convert to API-level authorization with `@authorize` decorator

---

**Pattern**: JSONB fields for flexibility

```sql
metadata JSONB
```

**Solution**: Prisma `Json` type with TypeScript interfaces

---

#### 2. Authentication Patterns

**Pattern**: Supabase Auth everywhere

```typescript
const {
  data: { user },
} = await supabase.auth.getUser();
```

**Solution**: JWT/Keycloak provider with same interface

---

**Pattern**: Email/password + magic links

```typescript
await supabase.auth.signInWithOtp({ email });
```

**Solution**: Email service + token generation

---

#### 3. React Hooks Patterns

**Pattern**: Direct Supabase queries in components

```typescript
const { data } = useQuery(["items"], async () => {
  const { data } = await supabase.from("items").select("*");
  return data;
});
```

**Solution**: API client hooks

```typescript
const { data } = useQuery(["items"], () => fetchAPI("/api/items"));
```

---

**Pattern**: Realtime subscriptions

```typescript
supabase
  .channel('table-changes')
  .on('postgres_changes', { ... }, callback)
  .subscribe();
```

**Solution**: WebSockets or Server-Sent Events

---

#### 4. Edge Functions Patterns

**Pattern**: Deno serve wrapper

```typescript
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => { ... });
```

**Solution**: Fastify route handlers

---

**Pattern**: Supabase client in functions

```typescript
const supabase = createClient(url, key, {
  global: { headers: { Authorization: authHeader } },
});
```

**Solution**: Prisma client + auth from request

---

**Pattern**: AI API calls (OpenAI, Anthropic)

```typescript
const response = await fetch("https://api.openai.com/v1/chat/completions", {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}` },
  body: JSON.stringify(payload),
});
```

**Solution**: AI Gateway with provider abstraction

---

#### 5. Storage Patterns

**Pattern**: Supabase Storage for files

```typescript
await supabase.storage.from("bucket").upload("path/file.pdf", file);
```

**Solution**: MinIO (S3-compatible) or local filesystem

---

### Anti-Patterns to Avoid

❌ **Mixing data layer in components**

```typescript
// BAD - in React component
const { data } = await supabase.from("users").select("*");
```

✅ **Use hooks layer**

```typescript
// GOOD - in hook
export function useUsers() {
  return useQuery(["users"], () => fetchAPI("/api/users"));
}
```

---

❌ **Hardcoded Supabase URLs**

```typescript
const SUPABASE_URL = "https://xxx.supabase.co";
```

✅ **Environment variables**

```typescript
const API_URL = import.meta.env.VITE_API_URL;
```

---

❌ **Business logic in Edge Functions**

```typescript
// BAD - complex logic in function
serve(async (req) => {
  // 200 lines of business logic
});
```

✅ **Services + thin handlers**

```typescript
// GOOD - logic in service
export class ContractService {
  async analyze(data) { ... }
}

// Thin route handler
fastify.post('/analyze', async (req, reply) => {
  return contractService.analyze(req.body);
});
```

---

## Design Principles for Future Migrations

### 1. Provider Agnosticism

**Principle**: Never couple to specific vendors

**Implementation**:

- Abstract interfaces for auth, storage, AI
- Environment-driven configuration
- Plugin architecture

**Example**:

```typescript
interface IAuthProvider {
  login(credentials): Promise<Token>;
  validateToken(token): Promise<User>;
}

// Can switch: JWT, Keycloak, Auth0, Cognito
```

---

### 2. Clear Layer Separation

**Principle**: Strict boundaries between layers

**Layers**:

1. **Routes** (HTTP/validation)
2. **Services** (business logic)
3. **Repositories** (data access)
4. **Providers** (external systems)

**Benefits**:

- Easy testing
- Reduced coupling
- Clear dependencies

---

### 3. Configuration Over Code

**Principle**: Behavior controlled by env vars, not code changes

**Examples**:

- `AUTH_PROVIDER=jwt` vs `AUTH_PROVIDER=keycloak`
- `AI_PROVIDER=ollama` vs `AI_PROVIDER=azure`
- `STORAGE_PROVIDER=minio` vs `STORAGE_PROVIDER=s3`

---

### 4. Database Flexibility

**Principle**: Support multiple databases with same code

**Implementation**:

- Prisma abstracts PostgreSQL, MySQL, MongoDB
- Environment-driven connection
- Migrations version-controlled

**Example**:

```env
# PostgreSQL
DATABASE_URL="postgresql://user:pass@localhost:5432/db"

# MySQL
DATABASE_URL="mysql://user:pass@localhost:3306/db"
```

---

### 5. Graceful Degradation

**Principle**: System works even if some services fail

**Implementation**:

- Fallbacks for AI services
- Cached data when DB slow
- Default values when config missing

**Example**:

```typescript
async function analyzeWithAI(text: string) {
  try {
    return await aiService.analyze(text);
  } catch (error) {
    log.warn("AI service failed, using fallback");
    return fallbackAnalysis(text);
  }
}
```

---

### 6. Observable Systems

**Principle**: All systems must be monitorable

**Implementation**:

- Structured logging (JSON)
- Health check endpoints
- Metrics exposure (Prometheus)
- Distributed tracing

**Example**:

```typescript
fastify.get("/health", async () => ({
  status: "ok",
  timestamp: new Date().toISOString(),
  services: {
    database: await checkDB(),
    redis: await checkRedis(),
    ai: await checkAI(),
  },
}));
```

---

### 7. Security by Default

**Principle**: Secure unless explicitly opened

**Implementation**:

- Authentication required by default
- HTTPS enforced
- Rate limiting enabled
- Input validation mandatory
- SQL injection prevention (Prisma)

---

### 8. Documentation as Code

**Principle**: Documentation lives with code

**Implementation**:

- OpenAPI/Swagger from TypeBox schemas
- JSDoc comments
- README in every major folder
- Examples in code

---

## Reusable Migration Playbook

### Pre-Migration Checklist

**Week -2: Planning**

- [ ] Stakeholder approval obtained
- [ ] Migration timeline communicated
- [ ] Backup strategy defined
- [ ] Rollback plan documented
- [ ] Success criteria defined

**Week -1: Preparation**

- [ ] Full Supabase backup taken
- [ ] Infrastructure provisioned (servers, Docker)
- [ ] Dependencies installed
- [ ] AI API keys obtained
- [ ] Team trained on new tools

---

### Migration Execution (5-7 Days)

**Day 1: Setup & Inspection**

- [ ] Clone Lovable project
- [ ] Create API repository
- [ ] Configure workspace
- [ ] Run project inspector
- [ ] Review inspection.json

**Day 2: Schema & Routes**

- [ ] Generate Prisma schema
- [ ] Validate schema
- [ ] Generate CRUD routes
- [ ] Review generated code

**Day 3: Functions & Auth**

- [ ] Migrate Edge Functions
- [ ] Generate auth system
- [ ] Configure auth provider
- [ ] Migrate users

**Day 4: Database & Testing**

- [ ] Setup PostgreSQL
- [ ] Run migrations
- [ ] Seed data
- [ ] Test CRUD operations
- [ ] Test AI functions

**Day 5-6: Frontend Migration**

- [ ] Update API configuration
- [ ] Migrate hooks
- [ ] Update authentication
- [ ] Test full user flows
- [ ] Fix bugs

**Day 7: Deployment & Verification**

- [ ] Generate Docker config
- [ ] Deploy containers
- [ ] Run production tests
- [ ] Monitor logs
- [ ] Security checklist

---

### Post-Migration Checklist

**Week +1: Stabilization**

- [ ] Monitor error rates
- [ ] Optimize slow queries
- [ ] Fix reported bugs
- [ ] Gather user feedback
- [ ] Tune performance

**Week +2: Optimization**

- [ ] Implement caching
- [ ] Add missing features
- [ ] Improve documentation
- [ ] CI/CD setup
- [ ] Backup verification

---

## Project-Agnostic Validation

This Migration Kit is **NOT** coupled to AUREA. It works for any Lovable project:

### Universal Inputs

✅ Any Supabase types.ts structure  
✅ Any SQL migrations format  
✅ Any Edge Functions (Deno)  
✅ Any React hooks pattern

### Configurable Outputs

✅ PostgreSQL or MySQL via Prisma  
✅ JWT or Keycloak auth  
✅ Any AI provider (Ollama, Azure, OpenAI)  
✅ Any deployment target (Docker, Kubernetes, VM)

### Project-Specific Only

⚠️ Business logic (preserved from original)  
⚠️ UI/UX (kept from Lovable)  
⚠️ Data model (extracted from types.ts)

### Reusability Tests

**Can migrate these Lovable projects with ZERO changes to kit:**

- [ ] E-commerce with products/orders/payments
- [ ] SaaS with workspaces/users/subscriptions
- [ ] CMS with posts/pages/media
- [ ] CRM with contacts/deals/activities
- [ ] Task manager with projects/tasks/comments

**Only project-specific work:**

- Review generated code quality
- Add custom business logic
- Configure environment variables
- Test domain-specific features

---

## Technical Decisions Documentation

### Decision 1: Why Fastify Over Express?

**Decision**: Use Fastify as web framework

**Rationale**:

- 2x faster than Express
- Built-in schema validation (TypeBox)
- Native async/await support
- Plugin architecture
- Better TypeScript support
- OpenAPI/Swagger generation

**Alternatives Considered**:

- Express: Too slow, lacks validation
- NestJS: Over-engineered for most projects
- Hapi: Less ecosystem support

**Trade-offs**:

- Learning curve for Express users
- Fewer middlewares available
- Different plugin system

---

### Decision 2: Why Prisma Over TypeORM?

**Decision**: Use Prisma as ORM

**Rationale**:

- Type-safe query builder
- Excellent TypeScript support
- Automatic migrations
- Multi-database support
- Better performance
- Active development

**Alternatives Considered**:

- TypeORM: More complex, less type-safe
- Sequelize: Dated API, poor TypeScript
- Knex: Too low-level, no types

**Trade-offs**:

- Must learn Prisma schema language
- Migration generation can be opinionated
- No support for MongoDB relations

---

### Decision 3: Why Docker Over VMs?

**Decision**: Use Docker for deployment

**Rationale**:

- Consistent environments
- Easy local development
- Version-controlled infrastructure
- Portable across cloud providers
- Lower resource overhead than VMs

**Alternatives Considered**:

- VMs: Higher overhead, slower
- Kubernetes: Overkill for most projects
- Bare metal: Hard to replicate

**Trade-offs**:

- Docker learning curve
- Windows compatibility issues
- Resource limits management

---

### Decision 4: Why JWT vs Sessions?

**Decision**: Support both JWT and Keycloak

**Rationale**:

- JWT: Stateless, scales horizontally
- Keycloak: Enterprise features (SSO, MFA, LDAP)
- Plugin architecture allows choice
- Environment-driven selection

**Alternatives Considered**:

- Sessions only: Doesn't scale
- OAuth2 only: Over-complex
- Passport.js: Too many strategies

**Trade-offs**:

- Must implement both providers
- Different token formats
- Refresh token complexity

---

### Decision 5: Why Ollama for Production AI?

**Decision**: Ollama as default AI provider

**Rationale**:

- Fully on-premise
- No external API calls
- Data privacy guaranteed
- Llama 3.3 70B competitive quality
- Cost-effective (no per-token pricing)

**Alternatives Considered**:

- OpenAI: Excellent but cloud-only
- Azure OpenAI Gov: Good but expensive
- Anthropic: Great but cloud-only

**Trade-offs**:

- Requires GPU hardware
- Self-hosted maintenance
- Model updates manual

---

### Decision 6: Why PostgreSQL Over MySQL?

**Decision**: PostgreSQL as default database

**Rationale**:

- JSON/JSONB support (critical for Supabase migrations)
- Array types
- Better performance for complex queries
- ENUM support
- Full-text search built-in

**Alternatives Considered**:

- MySQL: Less advanced features
- MongoDB: No relations, poor for this use case
- SQLite: Not production-ready

**Trade-offs**:

- Slightly more complex to manage
- Larger resource footprint
- Windows support less mature

---

## Next Steps After Migration

1. **CI/CD Setup**: Configure automated testing and deployment
2. **Monitoring**: Set up application monitoring (Prometheus, Grafana)
3. **Backups**: Implement automated database backups
4. **Security Audit**: Review security configurations
5. **Load Testing**: Test under production-like load
6. **Documentation**: Complete API and deployment documentation
7. **Training**: Train team on new architecture

## Support

For issues or questions:

- Review `migration/CODING_GUIDELINES.md` for code standards
- Check `migration/README.md` for toolkit documentation
- Refer to `migration/examples/AUREA-MIGRATION.md` for real-world example
