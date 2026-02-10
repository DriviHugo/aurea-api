# Troubleshooting Guide

## Common Issues and Solutions

### 🐛 Server starts but exits immediately

**Symptoms:**

- `npm run dev` shows "Server listening" but then exits
- `dotenv` shows "injecting env (0)" or very few variables
- Test scripts fail with connection errors

**Causes:**

1. **Malformed .env file** - Variables with incorrect spacing (e.g., `APP_PORT =4789` instead of `APP_PORT=4789`)
2. **Missing APP\_\* variables** - Server needs `APP_HOST`, `APP_PORT`, etc.

**Solution:**

```bash
# Copy the example file
cp .env.example .env

# Edit .env and ensure proper format (no spaces around =)
APP_NAME=your-project-name
APP_PORT=4789

# NOT like this:
# APP_PORT =4789  ❌ (breaks dotenv parsing)
```

---

### 🔌 Connection Refused Errors

**Symptoms:**

- `ECONNREFUSED` for PostgreSQL or Redis
- Server starts but can't connect to databases

**Cause:**
Wrong ports in `.env` - Docker maps internal ports (5432, 6379) to external ports (54320, 35302)

**Solution:**

```bash
# Verify Docker ports
docker ps

# Update .env with mapped ports
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/myproject"
REDIS_PORT="35302"
```

**Default Docker port mappings:**

- PostgreSQL: `54320:5432` (use 54320 in .env)
- Redis: `35302:6379` (use 35302 in .env)

---

### 💾 Database Connection Fails

**Symptoms:**

- "Can't reach database server"
- Migration fails

**Solutions:**

1. **Start Docker containers:**

```bash
npm run docker:up
```

2. **Verify containers are healthy:**

```bash
docker ps
# Look for "healthy" status
```

3. **Create database if needed:**

```bash
docker exec migration-boilerplate-postgres psql -U postgres -c "CREATE DATABASE myproject;"
```

4. **Run migrations:**

```bash
npx prisma migrate dev --name init
```

---

### 🪟 Windows Path Issues (ESM)

**Symptoms:**

- `schema-migrator.ts` doesn't run
- `isMainModule` is always `false`

**Cause:**
Windows uses backslashes (`C:\path`) while `import.meta.url` uses forward slashes (`file:///C:/path`)

**Solution:**
Already fixed in v1.0.1+ using `pathToFileURL`:

```typescript
import { pathToFileURL } from "url";
const isMainModule = import.meta.url === pathToFileURL(process.argv[1]).href;
```

---

### 🧪 Test Scripts Fail

**Symptoms:**

- `npm run test:migration` times out
- "Server failed to start within timeout period"

**Checklist:**

1. ✅ **Docker is running:**

```bash
docker ps  # Should show postgres and redis containers
```

2. ✅ **.env is properly formatted:**

```bash
# Check for proper variable format
cat .env | grep "APP_PORT"
# Should show: APP_PORT=4789 (no spaces around =)
```

3. ✅ **Ports are correct:**

```bash
# .env should use Docker mapped ports
DATABASE_URL="...@localhost:54320/..."  # Not 5432
REDIS_PORT="35302"                       # Not 6379
```

4. ✅ **Database exists:**

```bash
docker exec migration-boilerplate-postgres psql -U postgres -l
# Should list your database
```

5. ✅ **Migrations applied:**

```bash
npx prisma migrate status
```

---

### 🚀 Quick Validation Workflow

Before running tests, validate your setup:

```bash
# 1. Environment file exists and is correct
test -f .env && echo "✅ .env exists" || echo "❌ .env missing"

# 2. Docker is running
docker ps | grep -q "migration-boilerplate" && echo "✅ Docker running" || echo "❌ Docker not running"

# 3. Database connection works
docker exec migration-boilerplate-postgres pg_isready -U postgres

# 4. Redis connection works
docker exec migration-boilerplate-redis redis-cli ping

# 5. Start server manually to see logs
npm run dev
# Should show: "✅ Server listening at http://127.0.0.1:4789"

# 6. In another terminal, test endpoints
npm run test:quick
```

---

### 📋 Valid .env Format Example

```bash
# Application (no spaces around =)
APP_NAME=my-project
APP_VERSION=1.0.0
APP_HOST=127.0.0.1
APP_PORT=4789
APP_BASE_ENDPOINT=http://localhost:4789

# Database (use Docker mapped port 54320)
DATABASE_URL="postgresql://postgres:postgres@localhost:54320/myproject"
DIRECT_URL="postgresql://postgres:postgres@localhost:54320/myproject"

# Redis (use Docker mapped port 35302)
REDIS_HOST="localhost"
REDIS_PORT="35302"
REDIS_PASSWORD=""

# AI Keys (for migration)
ANTHROPIC_API_KEY="sk-ant-..."
# or
GEMINI_API_KEY="..."
```

---

### 🔍 Debug Mode

To see detailed startup logs:

```bash
# Enable debug output
export DEBUG=*

# Or in PowerShell
$env:DEBUG="*"

# Run server
npx tsx src/index.ts
```

---

## Still Having Issues?

1. Check [QUICKSTART.md](./QUICKSTART.md) for basic setup
2. Check [TESTING.md](./TESTING.md) for test documentation
3. Review your `.env` file format carefully
4. Verify Docker containers are healthy: `docker ps`
5. Check server logs when running `npm run dev`
