# Testing Scripts for Migrated Endpoints

This directory contains automated testing scripts to verify that your migrated endpoints are working correctly.

## Available Scripts

### 1. `npm run test:migration` - Full Automated Test

**What it does:**

- Automatically starts the development server
- Waits for the server to be ready
- Tests all configured endpoints
- Shuts down the server
- Reports results

**When to use:**

- After completing migration to verify all endpoints exist
- Before committing migration changes
- In CI/CD pipelines

**Usage:**

```bash
npm run test:migration
```

**Configuration:**
Edit `test-migration.ts` and update the `ENDPOINTS_TO_TEST` array with your migrated endpoint names:

```typescript
const ENDPOINTS_TO_TEST: string[] = [
  "user",
  "post",
  "comment",
  // ... add your endpoints here
];
```

---

### 2. `npm run test:quick` - Quick Test (Server Running)

**What it does:**

- Tests all configured endpoints quickly
- Assumes server is already running
- Provides immediate feedback

**When to use:**

- During development with `npm run dev` running
- Quick verification after code changes
- When you need fast feedback

**Usage:**

```bash
# Terminal 1: Start server
npm run dev

# Terminal 2: Run tests
npm run test:quick
```

**Configuration:**
Same as test:migration - edit `quick-test.ts` and update `ENDPOINTS_TO_TEST` array.

---

### 3. `npm run test:real` - Real Functionality Test

**What it does:**

- Tests public endpoints (health check)
- Verifies authentication protection
- Tests registration and login flow
- Tests authenticated requests to protected endpoints
- Provides comprehensive functionality verification

**When to use:**

- To verify complete authentication flow works
- To test actual data retrieval (not just protection)
- Before production deployment
- To verify SMTP configuration (for registration)

**Usage:**

```bash
# With server running
npm run test:real
```

**What you'll see:**

- ✅ Public endpoints working
- 🔒 Protected endpoints requiring auth
- 👤 User registration and login
- 📊 Data retrieval from authenticated endpoints

---

## Understanding Test Results

### Status Codes

| Code        | Meaning           | Result                                |
| ----------- | ----------------- | ------------------------------------- |
| **200-299** | Success           | ✅ Endpoint working correctly         |
| **401**     | Unauthorized      | 🔒 Endpoint protected (expected!)     |
| **404**     | Not Found         | ❌ Endpoint missing or not registered |
| **500**     | Server Error      | ⚠️ Check server logs for details      |
| **0**       | Connection Failed | ❌ Server not running                 |

### What "Protected (401)" Means

**401 is GOOD!** ✅

It means:

- ✓ The endpoint exists
- ✓ The route is registered
- ✓ Authentication middleware is working
- ✓ The endpoint requires a valid token

This confirms your migration was successful. To test with actual data, use `npm run test:real` which handles authentication.

---

## Quick Start After Migration

1. **Configure endpoints** (one time):

   ```bash
   # Edit test-migration.ts and add your endpoint names
   code test-migration.ts
   ```

2. **Run automated test**:

   ```bash
   npm run test:migration
   ```

3. **Verify results**:

   ```
   📊 Results:
      23/23 success
      23 protected
      0 failed

   ✅ All endpoints are working correctly!
   ```

---

## Troubleshooting

### "No endpoints configured for testing"

- Update the `ENDPOINTS_TO_TEST` array in the test files
- Add your generated endpoint names (e.g., 'user', 'post', etc.)

### "Connection failed (0)"

- Make sure the server is running (`npm run dev`)
- Check if port 4789 is available
- Verify Docker containers are running (`docker ps`)

### "Server failed to start within timeout"

- Increase `STARTUP_TIMEOUT` in test-migration.ts
- Check server logs for errors
- Verify database is accessible

### All endpoints return 404

- Check routes are registered in `src/routes/private/index.ts`
- Verify generated routes are imported correctly
- Run `npm run lint:fix` to check for TypeScript errors

### Registration/Login fails (500)

- Configure SMTP settings in `.env`
- Or create test user directly in database
- Check `test-real-endpoints.ts` for manual user creation

---

## Example Output

### Successful Test

```
🚀 Starting development server...
⏳ Waiting for server to be ready...
✅ Server is ready

📋 Testing generated endpoints...

🔒 user: Protected
🔒 post: Protected
🔒 comment: Protected

============================================================
📊 Results:
   3/3 success
   3 protected
   0 failed

✅ All endpoints are working correctly!
```

### Failed Test

```
📋 Testing generated endpoints...

🔒 user: Protected
❌ post: Not found
   Error: 404 - Route not registered

============================================================
📊 Results:
   1/3 success
   1 protected
   2 failed

❌ Some endpoints failed. Check the output above for details.
```

---

## Integration with CI/CD

Add to your CI pipeline (e.g., GitHub Actions):

```yaml
- name: Test migrated endpoints
  run: |
    npm run docker:up
    npm run test:migration
```

---

## Tips

- 💡 Run `test:quick` frequently during development
- 📝 Keep `ENDPOINTS_TO_TEST` updated as you add routes
- 🔒 401 responses are expected and correct!
- 🧪 Use `test:real` to verify full authentication flow
- 📊 Check the summary at the end of each test run

---

## Need Help?

- Check server logs: `npm run dev`
- View Docker logs: `npm run docker:logs`
- Verify routes: `grep -r "register(" src/routes/`
- Test health: `curl http://localhost:4789/health`
