# 🚀 Quick Start - Lovable to On-Premise Migration

## Prerequisites

- Node.js 22+
- Docker Desktop running
- Lovable project to migrate

---

## Migration Steps

### 1. Start Docker Services

```bash
npm run docker:up
```

### 2. Configure AI Provider

```bash
# Add to .env file
export ANTHROPIC_API_KEY="sk-ant-..."
# or
export GEMINI_API_KEY="..."
```

### 3. Locate Your Lovable Project

```bash
# Your Lovable project should be accessible locally
# Example: /path/to/your-lovable-project
```

### 4. Run Complete Migration

```bash
npm run migrate:all /path/to/your-lovable-project
```

**What happens:**

- ✅ Inspects Lovable project structure
- ✅ Generates Prisma schema from Supabase
- ✅ Creates CRUD routes for all models
- ✅ Migrates edge functions to Fastify
- ✅ Registers all routes automatically

### 5. Configure Test Endpoints

Edit `test-migration.ts` and add your model names:

```typescript
const ENDPOINTS_TO_TEST: string[] = [
  "user",
  "post",
  "comment",
  // add your models here
];
```

### 6. Run Automated Tests

```bash
npm run test:migration
```

**What happens:**

- ✅ Starts server automatically
- ✅ Tests all endpoints
- ✅ Verifies authentication (401)
- ✅ Shows results summary
- ✅ Stops server

### 7. Start Development Server

```bash
npm run dev
```

Your API is now running at `http://localhost:4789`

---

## Quick Commands Reference

| Task                            | Command                                |
| ------------------------------- | -------------------------------------- |
| **Full Migration**              | `npm run migrate:all /path/to/project` |
| **Test Endpoints**              | `npm run test:migration`               |
| **Quick Test** (server running) | `npm run test:quick`                   |
| **Start Dev Server**            | `npm run dev`                          |
| **Start Docker**                | `npm run docker:up`                    |
| **Stop Docker**                 | `npm run docker:down`                  |
| **View Docker Logs**            | `npm run docker:logs`                  |

---

## Expected Results

After migration:

- ✅ `prisma/schema.prisma` with all your models
- ✅ `src/routes/generated/*.routes.ts` (one per model)
- ✅ All routes automatically registered
- ✅ Edge functions converted to Fastify

After testing:

```
📊 Results:
   23/23 success
   23 protected
   0 failed

✅ All endpoints are working correctly!
```

---

## Troubleshooting

**Migration fails:**

- Check `ANTHROPIC_API_KEY` or `GEMINI_API_KEY` is set
- Verify source project path is correct
- Ensure Docker is running

**Tests fail:**

- Update `ENDPOINTS_TO_TEST` array in `test-migration.ts`
- Check Docker containers are healthy: `docker ps`
- Verify database is accessible

**Need help?**

- Full documentation: [migration/README.md](migration/README.md)
- Testing guide: [TESTING.md](TESTING.md)
- Migration plan: [migration/MIGRATION_PLAN.md](migration/MIGRATION_PLAN.md)

---

## That's it! 🎉

Two commands for complete migration:

1. `npm run migrate:all /path/to/lovable-project`
2. `npm run test:migration`
