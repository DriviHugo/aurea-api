# Migration Reference Guide

This document contains architectural patterns, design principles, and technical decisions supporting the Migration Plan.

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
**Solution**: Convert to API-level authorization with `@authorize` decorator

---

**Pattern**: JSONB fields for flexibility
**Solution**: Prisma `Json` type with TypeScript interfaces

---

#### 2. Authentication Patterns

**Pattern**: Supabase Auth everywhere
**Solution**: JWT/Keycloak provider with same interface

---

**Pattern**: Email/password + magic links
**Solution**: Email service + token generation

---

#### 3. React Hooks Patterns

**Pattern**: Direct Supabase queries in components
**Solution**: API client hooks (`useQuery` wrapping `fetchAPI`)

---

**Pattern**: Realtime subscriptions
**Solution**: WebSockets or Server-Sent Events

---

#### 4. Edge Functions Patterns

**Pattern**: Deno serve wrapper
**Solution**: Fastify route handlers

---

**Pattern**: Supabase client in functions
**Solution**: Prisma client + auth from request

---

#### 5. Storage Patterns

**Pattern**: Supabase Storage for files
**Solution**: MinIO (S3-compatible) or local filesystem

---

### Anti-Patterns to Avoid

❌ **Mixing data layer in components**
✅ **Use hooks layer**

❌ **Hardcoded Supabase URLs**
✅ **Environment variables**

❌ **Business logic in Edge Functions**
✅ **Services + thin handlers**

---

## Design Principles

### 1. Provider Agnosticism

**Principle**: Never couple to specific vendors (Abstract interfaces for auth, storage, AI).

### 2. Clear Layer Separation

**Layers**: Routes (HTTP) -> Services (Logic) -> Repositories (Data) -> Providers (External).

### 3. Configuration Over Code

**Principle**: Behavior controlled by env vars (`AUTH_PROVIDER`, `AI_PROVIDER`).

### 4. Database Flexibility

**Principle**: Support multiple databases via Prisma (PostgreSQL/MySQL).

### 5. Graceful Degradation

**Principle**: System works even if some services fail (Fallbacks).

### 6. Observable Systems

**Principle**: Structured logging, health checks, metrics.

### 7. Security by Default

**Principle**: Secure unless explicitly opened (Auth required, HTTPS).

### 8. Documentation as Code

**Principle**: OpenAPI generation, typed schemas.

---

## Technical Decisions Documentation

### Decision 1: Why Fastify Over Express?

**Rationale**: 2x faster, built-in validation (TypeBox), better TypeScript support.
**Trade-offs**: Different plugin ecosystem than Express.

### Decision 2: Why Prisma Over TypeORM?

**Rationale**: Type-safe query builder, auto migrations, better performance.
**Trade-offs**: Opinionated schema definition.

### Decision 3: Why Docker Over VMs?

**Rationale**: Consistent environments, easy local dev, portable.
**Trade-offs**: Initial learning curve.

### Decision 4: Why JWT vs Sessions?

**Rationale**: JWT for stateless scaling, Keycloak for enterprise features.
**Trade-offs**: Complexity of supporting two providers.

### Decision 5: Why Ollama for Production AI?

**Rationale**: Fully on-premise, data privacy, no per-token cost.
**Trade-offs**: Requires strong hardware (GPU).

### Decision 6: Why PostgreSQL Over MySQL?

**Rationale**: Native JSONB, arrays, better complex queries.
**Trade-offs**: Slightly higher resource footprint.
