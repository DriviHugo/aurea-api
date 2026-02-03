# Authentication System Generator Prompt

You are an expert backend developer specializing in enterprise authentication systems. Your task is to generate a complete, production-ready authentication system for a Fastify API that supports multiple authentication providers through a plugin architecture.

## Context

The application is migrating from Supabase Auth to an on-premise solution. The authentication system must:

1. Support **two providers**: JWT (simple) and Keycloak (enterprise)
2. Allow switching providers via environment variables (no code changes)
3. Follow **plugin architecture** patterns for Fastify
4. Comply with **enterprise coding guidelines** (see below)
5. Support role-based authorization
6. Provide comprehensive error handling
7. Include token refresh mechanisms

## Coding Guidelines

**CRITICAL**: All generated code MUST follow these standards:

### Language and Naming

- **English only** for all code, comments, and documentation
- **camelCase**: Variables, functions, parameters, object properties
- **PascalCase**: Classes, interfaces, types, enums, Prisma models
- **UPPER_SNAKE_CASE**: Constants, environment variables
- **kebab-case**: File names, URLs, CSS classes

### Code Quality

- **Self-descriptive code**: Variable/function names explain purpose
- **No Spanish**: Zero tolerance for Spanish text in code
- **Minimal comments**: Only for complex business logic
- **2-space indentation**
- **80-100 character lines** (strict limit)
- **Explicit types**: No `any`, use TypeScript strict mode
- **Error handling**: Every async operation must have try-catch or error handling

### Architecture Patterns

- **Single Responsibility Principle**
- **Dependency Injection** where applicable
- **Interface segregation**: Small, focused interfaces
- **No magic numbers**: Use named constants
- **Functional programming**: Prefer pure functions

## Authentication Provider Interface

Generate code that implements this interface structure:

```typescript
interface IAuthProvider {
  initialize(): Promise<void>;
  login(credentials: LoginCredentials): Promise<AuthToken>;
  validateToken(token: string): Promise<TokenValidation>;
  refreshToken(refreshToken: string): Promise<AuthToken>;
  logout(token: string): Promise<void>;
  getUserInfo(token: string): Promise<AuthUser>;
  hasRole(user: AuthUser, role: string): boolean;
  hasAnyRole(user: AuthUser, roles: string[]): boolean;
  hasAllRoles(user: AuthUser, roles: string[]): boolean;
}
```

## Files to Generate

### 1. `src/auth/types.ts`

Type definitions for the authentication system:

```typescript
export interface AuthUser {
  id: string;
  email: string;
  nombre: string;
  apellidos?: string;
  roles: string[];
  metadata?: Record<string, unknown>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface TokenValidation {
  valid: boolean;
  user?: AuthUser;
  error?: string;
}

// Provider configs
export interface AuthProviderConfig {
  provider: "jwt" | "keycloak";
}

export interface JwtAuthConfig extends AuthProviderConfig {
  provider: "jwt";
  secret: string;
  expiresIn: string;
  refreshExpiresIn?: string;
  issuer?: string;
  audience?: string;
}

export interface KeycloakAuthConfig extends AuthProviderConfig {
  provider: "keycloak";
  url: string;
  realm: string;
  clientId: string;
  clientSecret?: string;
  publicKey?: string;
}

export interface IAuthProvider {
  // Interface methods here
}
```

### 2. `src/auth/providers/base.provider.ts`

Abstract base class with common role-checking logic:

```typescript
import { IAuthProvider, AuthUser } from "../types";

export abstract class BaseAuthProvider implements IAuthProvider {
  // Implement common methods
  hasRole(user: AuthUser, role: string): boolean {
    return user.roles.includes(role);
  }

  hasAnyRole(user: AuthUser, roles: string[]): boolean {
    return roles.some((role) => user.roles.includes(role));
  }

  hasAllRoles(user: AuthUser, roles: string[]): boolean {
    return roles.every((role) => user.roles.includes(role));
  }

  protected normalizeRole(role: string): string {
    return role.toLowerCase().trim();
  }

  protected normalizeRoles(roles: string[]): string[] {
    return roles.map((role) => this.normalizeRole(role));
  }

  // Abstract methods that must be implemented
  abstract initialize(): Promise<void>;
  abstract login(
    credentials: import("../types").LoginCredentials,
  ): Promise<import("../types").AuthToken>;
  abstract validateToken(
    token: string,
  ): Promise<import("../types").TokenValidation>;
  abstract refreshToken(
    refreshToken: string,
  ): Promise<import("../types").AuthToken>;
  abstract logout(token: string): Promise<void>;
  abstract getUserInfo(token: string): Promise<AuthUser>;
}
```

### 3. `src/auth/providers/jwt.provider.ts`

JWT implementation:

**Requirements:**

- Use `jsonwebtoken` for signing/verifying
- Use `bcrypt` for password hashing
- Store refresh tokens in memory (Map) with expiration
- Query users from Prisma
- Include user roles in JWT payload
- Implement token refresh logic
- Clean expired refresh tokens periodically

**Key methods:**

- `login()`: Validate credentials, return access + refresh tokens
- `validateToken()`: Verify JWT signature and expiration
- `refreshToken()`: Exchange refresh token for new access token
- `logout()`: Remove refresh tokens for user
- `getUserInfo()`: Extract user data from token

### 4. `src/auth/providers/keycloak.provider.ts`

Keycloak implementation:

**Requirements:**

- Use `axios` for HTTP requests to Keycloak
- Use `jwks-rsa` for public key verification
- Verify tokens using Keycloak's public key
- Extract roles from realm_access and resource_access
- Support groups as roles (extract from group paths)
- Handle token refresh via Keycloak API

**Key methods:**

- `initialize()`: Verify Keycloak connectivity, fetch public key
- `login()`: POST to `/protocol/openid-connect/token` with password grant
- `validateToken()`: Verify token signature with JWKS
- `refreshToken()`: POST to `/protocol/openid-connect/token` with refresh_token grant
- `logout()`: POST to `/protocol/openid-connect/logout`
- `getUserInfo()`: GET from `/protocol/openid-connect/userinfo`

**Role extraction logic:**

```typescript
private extractRoles(data: any): string[] {
  const roles: Set<string> = new Set();

  // Realm roles
  if (data.realm_access?.roles) {
    data.realm_access.roles.forEach((role: string) => roles.add(role));
  }

  // Client roles
  if (data.resource_access?.[this.config.clientId]?.roles) {
    data.resource_access[this.config.clientId].roles.forEach((role: string) =>
      roles.add(role)
    );
  }

  // Groups
  if (data.groups) {
    data.groups.forEach((group: string) => {
      const roleName = group.split('/').pop();
      if (roleName) roles.add(roleName);
    });
  }

  return this.normalizeRoles(Array.from(roles));
}
```

### 5. `src/auth/index.ts`

Main auth plugin for Fastify:

**Requirements:**

- Read `AUTH_PROVIDER` from environment
- Instantiate correct provider based on config
- Initialize provider
- Register as Fastify decorator (`fastify.auth`)
- Log which provider is active

```typescript
import { FastifyInstance, FastifyPluginOptions } from "fastify";
import fp from "fastify-plugin";
import { JwtAuthProvider } from "./providers/jwt.provider";
import { KeycloakAuthProvider } from "./providers/keycloak.provider";
import { IAuthProvider } from "./types";

declare module "fastify" {
  interface FastifyInstance {
    auth: IAuthProvider;
  }
}

async function authPlugin(
  fastify: FastifyInstance,
  options: FastifyPluginOptions,
): Promise<void> {
  const provider = process.env.AUTH_PROVIDER || "jwt";

  let authProvider: IAuthProvider;

  if (provider === "jwt") {
    // Build JWT config from env
    // Instantiate JwtAuthProvider
  } else if (provider === "keycloak") {
    // Build Keycloak config from env
    // Instantiate KeycloakAuthProvider
  } else {
    throw new Error(`Unknown auth provider: ${provider}`);
  }

  await authProvider.initialize();

  fastify.decorate("auth", authProvider);
  fastify.log.info(`Auth provider initialized: ${provider}`);
}

export default fp(authPlugin, {
  name: "auth",
  fastify: "4.x",
});
```

### 6. `src/auth/decorators/authenticate.ts`

Authentication middleware:

**Requirements:**

- Extract `Authorization` header
- Validate `Bearer <token>` format
- Call `fastify.auth.validateToken()`
- Attach user to `request.user`
- Return 401 on failure

```typescript
declare module "fastify" {
  interface FastifyRequest {
    user?: import("../types").AuthUser;
  }
}

export async function authenticate(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Implementation
}
```

### 7. `src/auth/decorators/authorize.ts`

Authorization middleware factory:

**Requirements:**

- Check if user is authenticated
- Verify user has required role(s)
- Return 403 if insufficient permissions
- Support "any of" and "all of" role logic

```typescript
export function authorize(roles: string | string[]) {
  const requiredRoles = Array.isArray(roles) ? roles : [roles];

  return async (
    request: FastifyRequest,
    reply: FastifyReply,
  ): Promise<void> => {
    if (!request.user) {
      return reply.status(401).send({
        error: "Unauthorized",
        message: "User not authenticated",
      });
    }

    const hasPermission = request.server.auth.hasAnyRole(
      request.user,
      requiredRoles,
    );

    if (!hasPermission) {
      return reply.status(403).send({
        error: "Forbidden",
        message: "Insufficient permissions",
        required: requiredRoles,
        actual: request.user.roles,
      });
    }
  };
}

export function authorizeAll(roles: string[]) {
  // Implementation for "all roles required"
}
```

### 8. `src/routes/auth.routes.ts`

Authentication endpoints:

**Routes:**

- `POST /auth/login` - Login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Logout (invalidate tokens)
- `GET /auth/me` - Get current user info

**Requirements:**

- Use TypeBox for request/response validation
- Include OpenAPI/Swagger documentation
- Apply `authenticate` middleware where needed
- Proper error responses

Example:

```typescript
import { FastifyInstance } from "fastify";
import { Type, Static } from "@sinclair/typebox";
import { authenticate } from "../auth/decorators/authenticate";

const loginSchema = Type.Object({
  email: Type.String({ format: "email" }),
  password: Type.String({ minLength: 6 }),
});

export async function authRoutes(fastify: FastifyInstance): Promise<void> {
  fastify.post(
    "/login",
    {
      schema: {
        body: loginSchema,
        response: {
          200: Type.Object({
            accessToken: Type.String(),
            refreshToken: Type.Optional(Type.String()),
            expiresIn: Type.Number(),
            tokenType: Type.String(),
          }),
        },
        tags: ["auth"],
        summary: "User login",
      },
    },
    async (request, reply) => {
      const { email, password } = request.body as Static<typeof loginSchema>;

      try {
        const tokens = await fastify.auth.login({ email, password });
        return reply.send(tokens);
      } catch (error) {
        fastify.log.error(error);
        return reply.status(401).send({
          error: "Authentication failed",
          message:
            error instanceof Error ? error.message : "Invalid credentials",
        });
      }
    },
  );

  // Add other routes: /refresh, /logout, /me
}
```

## Usage Examples

Include usage examples in code comments:

```typescript
/**
 * Example: Protect route with authentication
 *
 * fastify.get('/api/data', {
 *   preHandler: authenticate
 * }, async (request, reply) => {
 *   // request.user is available
 * });
 */

/**
 * Example: Require specific role
 *
 * fastify.post('/api/admin', {
 *   preHandler: [authenticate, authorize('admin')]
 * }, async (request, reply) => {
 *   // Only admins can access
 * });
 */

/**
 * Example: Require any of multiple roles
 *
 * fastify.delete('/api/resource/:id', {
 *   preHandler: [authenticate, authorize(['admin', 'manager'])]
 * }, async (request, reply) => {
 *   // Admins or managers can access
 * });
 */
```

## Dependencies

The generated code should use these packages:

```json
{
  "dependencies": {
    "jsonwebtoken": "^9.0.2",
    "bcrypt": "^5.1.1",
    "axios": "^1.6.5",
    "jwks-rsa": "^3.1.0",
    "@sinclair/typebox": "^0.32.15",
    "fastify": "^4.26.0",
    "fastify-plugin": "^4.5.1"
  },
  "devDependencies": {
    "@types/jsonwebtoken": "^9.0.5",
    "@types/bcrypt": "^5.0.2"
  }
}
```

## Error Handling

All providers must handle these error cases:

- **Invalid credentials**: Clear error message, 401 status
- **Expired token**: Token expired message, 401 status
- **Invalid token format**: Malformed token, 401 status
- **Insufficient permissions**: Role mismatch, 403 status
- **Provider unavailable**: Connection error, 503 status
- **Configuration error**: Missing env vars, startup failure

## Testing Considerations

Generated code should be testable:

- Use dependency injection for Prisma client
- Mock external HTTP calls (Keycloak)
- Separate business logic from HTTP layer
- Provide factory functions for testing

## Security Best Practices

- Never log passwords or tokens
- Use constant-time comparison for tokens
- Validate all inputs
- Set secure token expiration times
- Implement rate limiting hooks
- Clear sensitive data from memory after use

## Configuration Examples

### JWT Configuration (.env)

```env
AUTH_PROVIDER=jwt
JWT_SECRET=change-this-to-a-secure-random-string-in-production
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d
JWT_ISSUER=aurea-api
JWT_AUDIENCE=aurea-client
```

### Keycloak Configuration (.env)

```env
AUTH_PROVIDER=keycloak
KEYCLOAK_URL=https://keycloak.example.com/auth
KEYCLOAK_REALM=aurea
KEYCLOAK_CLIENT_ID=aurea-api
KEYCLOAK_CLIENT_SECRET=your-client-secret-here
```

## Output Requirements

Generate complete, working code for all 8 files listed above. Each file must:

1. Follow all coding guidelines strictly
2. Include proper TypeScript types (no `any`)
3. Have comprehensive error handling
4. Include JSDoc comments for public methods
5. Be production-ready (no TODOs or placeholders)
6. Be properly formatted (2 spaces, 80-100 char lines)

The code should be ready to copy-paste and run with minimal configuration.
