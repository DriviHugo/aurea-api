
# Boilerplate API

[![Node.js Version](https://img.shields.io/badge/node-22.0.0-brightgreen.svg?style=flat)](http://nodejs.org/)
[![Fastify Version](https://img.shields.io/badge/fastify-5.4.0-brightgreen.svg?style=flat)](https://www.npmjs.com/package/fastify)


A modern, production-ready REST API boilerplate built with **Node.js**, **Fastify**, and **Prisma**.  
Includes user management, authentication, rate limiting, and best practices for scalable backend development.

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

| Script                | Description                                                      |
|-----------------------|------------------------------------------------------------------|
| `npm start`           | Start the server from the compiled `dist` folder                 |
| `npm run dev`         | Start the server in development mode with hot reload             |
| `npm run build`       | Build the project (TypeScript compilation)                       |
| `npm run clean`       | Remove the `dist` build output                                   |
| `npm run typecheck`   | Type-check the codebase without emitting files                   |
| `npm test`            | Run all tests with Jest                                          |
| `npm run lint`        | Run ESLint on `src` and `test`                                  |
| `npm run lint:fix`    | Run ESLint and auto-fix issues                                  |
| `npm run db:generate` | Generate Prisma client                                           |
| `npm run db:migrate`  | Run development database migrations                              |
| `npm run db:migrate:deploy` | Deploy migrations to production database                    |
| `npm run db:migrate:status` | Show migration status                                      |
| `npm run db:reset`    | Reset the database and re-apply all migrations                  |
| `npm run db:seed`     | Seed the database with initial data                             |
| `npm run docker:up`   | Start Docker containers (using docker-compose)                  |
| `npm run docker:down` | Stop Docker containers                                          |
| `npm run docker:logs` | Show logs from Docker containers                                |
---