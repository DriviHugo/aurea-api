# AUREA — AEAD Deployment Checklist

## What AEAD IT needs to provide

### 🔴 CRITICAL (app fails to start without these)

| Variable | What it is | Example | Who provides |
|----------|-----------|---------|--------------|
| `DATABASE_URL` | PostgreSQL connection | `postgresql://user:pass@host:5432/aurea` | AEAD DBA |
| `ACCESS_TOKEN_SECRET` | JWT signing key | 32 random chars | AEAD / generate locally |
| `REFRESH_TOKEN_SECRET` | JWT signing key | 32 random chars | AEAD / generate locally |
| `EMAIL_VALIDATION_SECRET` | Email token key | 32 random chars | AEAD / generate locally |
| `COOKIE_SECRET` | Cookie signing key | 32 random chars | AEAD / generate locally |
| `FRONTEND_BASE_URL` | Public frontend URL | `https://aurea.aead.gob.es` | AEAD DevOps |

### 🟡 IMPORTANT (needed for full functionality)

| Variable | What it is | Example | Who provides |
|----------|-----------|---------|--------------|
| `EMAIL_HOST` | SMTP server | `smtp.aead.gob.es` | AEAD IT |
| `EMAIL_PORT` | SMTP port | `587` or `25` | AEAD IT |
| `EMAIL_AUTH_USER` | SMTP username | `aurea@aead.gob.es` | AEAD IT |
| `EMAIL_AUTH_PASS` | SMTP password | `***` | AEAD IT |
| `REDIS_HOST` | Redis server | `redis.internal.aead` | AEAD DevOps |
| `REDIS_PORT` | Redis port | `6379` | AEAD DevOps |

### 🟢 OPTIONAL (only if specific features are enabled)

| Variable | When needed | Example | Who provides |
|----------|------------|---------|--------------|
| `OIDC_ISSUER_URL` | If using OpenAM SSO | `https://sso.aead.gob.es/openam/oauth2` | AEAD IT (only if SSO) |
| `OIDC_CLIENT_ID` | If using OpenAM SSO | `aurea-client` | AEAD IT (only if SSO) |
| `OIDC_CLIENT_SECRET` | If using OpenAM SSO | `***` | AEAD IT (only if SSO) |
| `AI_PRIMARY_GATEWAY_URL` | When on-prem AI is deployed | `http://gpu-server:8000/v1` | AEAD DevOps (later phase) |
| `AI_PRIMARY_API_KEY` | If on-prem AI requires auth | `***` | AEAD DevOps (later phase) |

---

## Timeline

### Phase 1: Initial Deployment (NOW)
- [ ] AEAD provides database credentials
- [ ] AEAD provides email/SMTP credentials
- [ ] AEAD provides Redis host/port
- [ ] Generate 4 secrets locally (or AEAD provides them)
- [ ] AEAD provides frontend base URL

**Status**: ✅ Can deploy with local auth only

### Phase 2: SSO Integration (IF NEEDED)
- [ ] AEAD registers app in OpenAM
- [ ] AEAD provides OIDC credentials

**Status**: ✅ SSO login enabled

### Phase 3: On-Premise AI (FUTURE)
- [ ] AEAD deploys ALIA LLM on their infrastructure
- [ ] AEAD provides AI gateway URL

**Status**: ✅ AI calls go to on-prem instead of cloud

---

## How to generate secrets locally

Use OpenSSL (recommended):
```bash
openssl rand -base64 32  # Run this 4 times for the 4 secrets
```

Or Node.js:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## Environment setup

1. Get `.env.example` from repo
2. Copy to `.env.production`
3. Fill in values from AEAD IT
4. Never commit `.env.production` to git

```bash
# Set environment
export NODE_ENV=production
export DATABASE_URL="postgresql://..."
export FRONTEND_BASE_URL="https://..."
# ... etc
```

Or use systemd/Docker with env file:
```dockerfile
ENV NODE_ENV=production
COPY .env.production /app/.env
```

---

## Verification checklist

- [ ] `DATABASE_URL` is set and connection works
- [ ] All 4 secrets are set (non-empty, 32+ chars)
- [ ] `FRONTEND_BASE_URL` matches actual domain
- [ ] `COOKIE_SECRET` is NOT "defaultCookieSecret"
- [ ] Email credentials work with AEAD SMTP
- [ ] Redis is reachable on provided host:port
- [ ] App starts without "[Startup] Missing required environment variables" error

---

## Asking AEAD IT

**Template email:**

```
Subject: AUREA API - Production Infrastructure Requirements

Hi AEAD IT Team,

For the AUREA API deployment on admin.aead.gob.es infrastructure, we need:

CRITICAL (required for launch):
- PostgreSQL connection string (host, port, username, password, database name)
- Public domain URL (e.g., https://aurea.aead.gob.es)
- Redis host and port (or Redis URL)

IMPORTANT:
- SMTP credentials (host, port, username, password)
- Email "from" address to use in system emails

OPTIONAL (now or later):
- If you plan to use SSO: OpenAM/OIDC issuer URL and client credentials
- When on-prem AI is ready: Gateway URL and model info

For secrets (JWT keys, cookie key), we can either:
A) Generate them locally with: openssl rand -base64 32
B) You provide them

Please confirm infrastructure availability and provide the above.

Thanks!
```

---

## Feature Flags & Disabled Routes

### Auto-Detected Features

| Feature | Detection | Behavior |
|---------|-----------|----------|
| **SSO** | `OIDC_ISSUER_URL` is set | If configured, `/sso/*` routes are enabled. Otherwise, SSO is completely disabled. |
| **Swagger** | `NODE_ENV !== "production"` OR `SWAGGER_ENABLED === "true"` | Documentation UI available only in dev/staging or if explicitly enabled. |

### Manual Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| `LOCAL_AUTH_ENABLED=true` | `false` | Enables `/auth/register` endpoint for local email/password signup. Disabled for AEAD (manual admin user creation only). |

### Disabled Routes (Production)

For security & simplification, the following boilerplate/test routes are **disabled by default in production**:

| Route prefix | Module | Why disabled |
|-------------|--------|-------------|
| `/ai-provider` | `aiprovider.routes.ts` | Boilerplate CRUD; not used in AUREA production |
| `/test-case` | `testcase.routes.ts` | Test fixture data; development-only |
| `/repair-document` | `repairdocument.routes.ts` | Debugging utility; not part of normal workflow |
| `/repair-extraction` | `repairextraction.routes.ts` | Debugging utility; not part of normal workflow |
| `/repair-rule` | `repairrule.routes.ts` | Debugging utility; not part of normal workflow |

These routes are entirely **omitted from registration** in production, not just marked as deprecated.

### How to Enable Features (if needed)

#### Enable Local Auth Registration
```bash
export LOCAL_AUTH_ENABLED=true
# Endpoint POST /auth/register is now available
```

#### Enable SSO
```bash
export OIDC_ISSUER_URL=https://sso.aead.gob.es/openam/oauth2
export OIDC_CLIENT_ID=aurea-client
export OIDC_CLIENT_SECRET=...
# Endpoints under /sso/* are now available
```

#### Enable Swagger in Production
```bash
export SWAGGER_ENABLED=true
# Swagger UI available at /swagger
```

#### Re-enable Debug Routes (not recommended)
Debug routes would need to be re-imported in `src/routes/private/index.ts`. This is **not recommended for production** security.

---
