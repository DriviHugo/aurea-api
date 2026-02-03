# AUREA API - Lovable-to-OnPrem Migration Kit + Backend

[![Node.js Version](https://img.shields.io/badge/node-22.0.0-brightgreen.svg?style=flat)](http://nodejs.org/)
[![Fastify Version](https://img.shields.io/badge/fastify-5.4.0-brightgreen.svg?style=flat)](https://www.npmjs.com/package/fastify)

**Dual-purpose repository:**

1. **Lovable-to-OnPrem Migration Kit** - Boilerplate genérico reutilizable para migrar cualquier proyecto Lovable a on-premise
2. **AUREA Backend** - Caso de uso real para Guardia Civil (España)

---

## 📁 Estructura Proyecto

```
aurea-api/
├── migration/                    # 🔧 Migration Kit (GENÉRICO - Reutilizable)
│   ├── README.md                # Documentación general del toolkit
│   ├── inspectors/              # Análisis proyectos Lovable
│   │   └── project-inspector.ts
│   ├── ai-migrators/            # Generación código con IA
│   │   ├── schema-migrator.ts   # SQL → Prisma
│   │   ├── route-generator.ts   # Prisma → CRUD routes
│   │   ├── function-migrator.ts # Edge Functions → Fastify
│   │   └── hook-transformer.ts  # React hooks Supabase → fetch
│   ├── scripts/                 # Utilidades sin IA
│   │   ├── validate-schema.ts
│   │   ├── generate-types.ts
│   │   └── setup-docker.ts
│   ├── prompts/                 # Prompts Claude/Gemini
│   │   └── schema-migrator.md
│   └── examples/                # Casos de uso reales
│       └── AUREA-MIGRATION.md   # 📚 Migración específica AUREA
│
├── src/                         # 🚀 Backend AUREA (Proyecto específico)
│   ├── routes/
│   │   ├── private/             # Endpoints autenticados
│   │   ├── public/              # Endpoints públicos
│   │   └── generated/           # Generados por Migration Kit
│   ├── services/
│   │   └── ai-gateway/          # Provider-agnostic AI (producción)
│   ├── plugins/
│   ├── config/
│   └── types/
│
├── prisma/                      # Schema AUREA (30 tablas)
│   └── schema.prisma
│
├── docker/                      # Docker Compose on-premise
│   └── docker-compose.yml
│
└── package.json                 # Scripts migración + desarrollo
```

---

## 🎯 Dos Usos Distintos

### 1️⃣ Como Boilerplate Migration Kit (GENÉRICO)

**Para:** Migrar **cualquier proyecto Lovable** a on-premise

**Documentación:** [migration/README.md](migration/README.md)

**Instalación:**

```bash
git clone https://github.com/1millionbot/aurea-api.git my-project-api
cd my-project-api
npm install
```

**Uso rápido:**

```bash
# Inspeccionar tu proyecto Lovable
npm run migrate:inspect -- --source /path/to/your-lovable-project

# Migrar schema
export MIGRATION_AI_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...
npm run migrate:schema

# Generar routes
npm run migrate:routes

# Ver documentación completa
cat migration/README.md
```

---

### 2️⃣ Como Backend AUREA (CASO ESPECÍFICO)

**Para:** Sistema contratación pública Guardia Civil

**Documentación:** [migration/examples/AUREA-MIGRATION.md](migration/examples/AUREA-MIGRATION.md)

**Características AUREA:**

- 30 tablas PostgreSQL (expedientes, documentos, CPV codes, etc.)
- 17 funciones IA (análisis contratos, generación documentos)
- Compliance ENS Alto (MFA, audit logs, backups)
- 18 React hooks migrados
- Docker on-premise (Ollama/Azure OpenAI Gov)

**Setup desarrollo AUREA:**

```bash
# Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales

# Levantar Docker
cd docker && docker-compose up -d

# Migrar base de datos
npm run db:migrate:deploy

# Seed datos iniciales
npm run db:seed

# Desarrollo
npm run dev
```

---

## Project Structure & Module System

This project is built with **TypeScript** and uses the **ECMAScript Modules (ESM)** system (`"type": "module"` in `package.json`).

- All source code is in the `src/` directory and compiled to `dist/`.
- Use `import`/`export` syntax everywhere (no `require`/`module.exports`).
- Node.js >=22 is required for full ESM and top-level await support.
- Some tools and dependencies may require ESM-compatible versions.
- When running scripts or using the REPL, ensure you use Node.js in ESM mode.

**Example import:**

```ts
import fastify from "fastify";
import prisma from "./config/prisma.js";
```

> If you use relative imports, always include the file extension (e.g., `.js` for compiled files, even if written in TypeScript).

---

---

## Table of Contents

- [Features](#features)
- [Authentication](#authentication)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Prisma ORM Setup](#prisma-orm-setup)
- [Database Migrations & Seeding](#database-migrations--seeding)
- [Testing](#testing)
- [Linting and Formatting](#linting-and-formatting)

---

## Features

- Fastify server with modular plugin architecture
- User registration, login, password reset, email validation
- JWT authentication (access/refresh tokens)
- API Key authentication (with IP/domain restrictions)
- Role-based authorization (admin/user)
- Rate limiting (per IP, per endpoint)
- Prisma ORM (PostgreSQL, experimental MongoDB support)
- Docker-ready for local development and CI
- Comprehensive testing setup (Jest)
- Linting, formatting, and Prettier integration

---

## Authentication

This API supports two main authentication and authorization methods:

### 1. JWT Authentication

- **Access Token:**  
  Short-lived JWT, sent as an HTTP-only cookie (`access_token`) or via `Authorization: Bearer` header.
- **Refresh Token:**  
  Longer-lived JWT, sent as an HTTP-only cookie (`refresh_token`). Used to obtain new access tokens.

**Typical flow:**

1. User logs in (`/auth/login`) and receives both tokens as cookies.
2. For protected endpoints, send the `access_token` cookie (or Bearer header).
3. When the access token expires, use `/auth/refresh` to get a new one using the `refresh_token`.

### 2. API Key Authentication

- For programmatic access, endpoints can be protected with API keys.
- API keys can be restricted by allowed IPs and domains.
- Send the API key in the `Authorization` header as:  
  `Authorization: API-KEY <keyId>:<secret>`

### 3. Role-based Authorization

- Some endpoints require the user to have admin privileges.
- The user's role is checked after authentication.

---

## API Documentation

Interactive API documentation is available via **Swagger UI** at:

[http://localhost:4789/docs](http://localhost:4789/docs)

---

## Prerequisites

- [Node.js](https://nodejs.org/en/) v22 or newer
- [npm](https://www.npmjs.com/) (comes with Node.js)
- [Docker](https://www.docker.com/) (for local development and testing)
- [PostgreSQL](https://www.postgresql.org/) (recommended) or [MongoDB](https://www.mongodb.com/) (experimental, see [Prisma ORM Setup](#prisma-orm-setup))

---

## Getting Started

1. **Clone the repository**

   ```bash
   git clone https://github.com/1millionbot/boilerplate-api.git
   cd boilerplate-api
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Copy and set environment variables**

   ```bash
   cp .env.development .env
   ```

   Edit `.env` and set the required variables (database connection, JWT secrets, etc).

4. **Docker Setup (optional but recommended)**

   Depending on your environment, copy the appropriate Docker Compose file from the `docker` directory:

   ```bash
   # For development
   cp docker/docker-compose.dev.yml docker/docker-compose.yml

   # For testing
   cp docker/docker-compose.test.yml docker/docker-compose.yml
   ```

   > Replace the environment (e.g., `dev`, `test`) as needed.

   ### Managing Docker Containers
   - **Start containers:**

     ```bash
     npm run docker:up
     ```

   - **Stop containers:**

     ```bash
     npm run docker:down
     ```

   - **View logs:**
     ```bash
     npm run docker:logs
     ```

5. **Start the server**

   ```bash
   npm start
   ```

   By default, the server will start on [http://localhost:4789](http://localhost:4789).

---

## Prisma ORM Setup

This project uses [Prisma](https://www.prisma.io/) as the ORM and supports **PostgreSQL** (recommended) and **MongoDB** (experimental).

1. **Configure your database in `.env`**  
   Set the `DATABASE_URL` variable to your PostgreSQL or MongoDB connection string.

2. **Edit your Prisma schema**  
   The file `prisma/schema.prisma` defines the main data models:
   - **UserEntity**: System users (fields: id, email, name, password, imageUrl, isAdmin, isActive, validatedAt, etc).
   - **SessionEntity**: Active sessions and refresh tokens (fields: sessionId, userId, refreshToken, fingerprint, ip, userAgent, expiresAt, revoked, etc).
   - **ApiKeyEntity**: API keys for programmatic access (fields: keyId, name, keyHash, scopes, isActive, allowedIps, allowedDomains, lastUsedAt, etc).

3. **Generate Prisma Client**

   ```bash
   npm run db:generate
   ```

---

## Database Migrations & Seeding

- **Generate Prisma Client:**

  ```bash
  npm run db:generate
  ```

- **Apply migrations (development):**

  ```bash
  npm run db:migrate
  ```

- **Apply migrations (production):**

  ```bash
  npm run db:migrate:deploy
  ```

- **Check migration status:**

  ```bash
  npm run db:migrate:status
  ```

- **Reset database and re-apply all migrations:**

  ```bash
  npm run db:reset
  ```

- **Seed the database:**
  ```bash
  npm run db:seed
  ```

> See the `package.json` scripts for more database commands.

---

## Testing

To run tests:

```bash
npm test
```

> You need Docker and the database services running to execute the tests.

---

## Linting and Formatting

To lint and auto-fix code:

```bash
npm run lint
npm run lint:fix
```

---

## NPM Scripts Reference

The following npm scripts are available for development and maintenance:

| Script                      | Description                                          |
| --------------------------- | ---------------------------------------------------- |
| `npm start`                 | Start the server from the compiled `dist` folder     |
| `npm run dev`               | Start the server in development mode with hot reload |
| `npm run build`             | Build the project (TypeScript compilation)           |
| `npm run clean`             | Remove the `dist` build output                       |
| `npm run typecheck`         | Type-check the codebase without emitting files       |
| `npm test`                  | Run all tests with Jest                              |
| `npm run lint`              | Run ESLint on `src` and `test`                       |
| `npm run lint:fix`          | Run ESLint and auto-fix issues                       |
| `npm run db:generate`       | Generate Prisma client                               |
| `npm run db:migrate`        | Run development database migrations                  |
| `npm run db:migrate:deploy` | Deploy migrations to production database             |
| `npm run db:migrate:status` | Show migration status                                |
| `npm run db:reset`          | Reset the database and re-apply all migrations       |
| `npm run db:seed`           | Seed the database with initial data                  |
| `npm run docker:up`         | Start Docker containers (using docker-compose)       |
| `npm run docker:down`       | Stop Docker containers                               |
| `npm run docker:logs`       | Show logs from Docker containers                     |

---
