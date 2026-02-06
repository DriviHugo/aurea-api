/**
 * Automated Endpoint Testing Script
 * Tests all generated CRUD routes from migration-boilerplate
 * 
 * Usage:
 *   npx tsx test-endpoints.ts                    # Test without auth (expects 401)
 *   npx tsx test-endpoints.ts --with-auth        # Test with fake auth token (expects 200/404)
 *   npx tsx test-endpoints.ts --token=<JWT>      # Test with real JWT token
 */

interface TestResult {
  endpoint: string;
  method: string;
  expectedStatus: number;
  actualStatus?: number;
  passed: boolean;
  error?: string;
  responseTime?: number;
  responseBody?: any;
}

interface TestOptions {
  withAuth: boolean;
  token?: string;
}

const API_BASE_URL = "http://localhost:3000";
const TIMEOUT_MS = 5000;

// All generated routes from index.ts
const GENERATED_ROUTES = [
  "/api/private/profile",
  "/api/private/user-role",
  "/api/private/expediente",
  "/api/private/alternativa-procedimiento",
  "/api/private/cpv-codigo",
  "/api/private/cpv-recomendado",
  "/api/private/evidencia",
  "/api/private/regla",
  "/api/private/documento",
  "/api/private/documento-seccion",
  "/api/private/documento-generacion",
  "/api/private/documento-version",
  "/api/private/documento-evidencia",
  "/api/private/validacion",
  "/api/private/validacion-evidencia",
  "/api/private/revision",
  "/api/private/comentario",
  "/api/private/audit-log",
  "/api/private/ai-provider",
  "/api/private/ai-function",
  "/api/private/ai-function-version",
  "/api/private/ai-function-log",
];

const COLORS = {
  reset: "\x1b[0m",
  green: "\x1b[32m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
};

async function testEndpoint(
  endpoint: string,
  method: string = "GET",
  expectedStatus: number = 401,
  options: TestOptions = { withAuth: false },
): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // Add authorization header if auth is enabled
    if (options.withAuth && options.token) {
      headers["Authorization"] = `Bearer ${options.token}`;
    }

    const response = await fetch(url, {
      method,
      signal: controller.signal,
      headers,
    });

    clearTimeout(timeoutId);
    const responseTime = Date.now() - startTime;

    // Try to parse response body
    let responseBody;
    try {
      const text = await response.text();
      responseBody = text ? JSON.parse(text) : null;
    } catch {
      // Ignore parse errors
    }

    const passed = response.status === expectedStatus;

    return {
      endpoint,
      method,
      expectedStatus,
      actualStatus: response.status,
      passed,
      responseTime,
      responseBody,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      endpoint,
      method,
      expectedStatus,
      passed: false,
      error: error instanceof Error ? error.message : String(error),
      responseTime,
    };
  }
}

async function testServerHealth(): Promise<boolean> {
  console.log(`${COLORS.cyan}🔍 Checking server health...${COLORS.reset}`);

  try {
    const response = await fetch(`${API_BASE_URL}/docs`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });

    if (response.status === 200) {
      console.log(`${COLORS.green}✅ Server is running${COLORS.reset}\n`);
      return true;
    } else {
      console.log(
        `${COLORS.red}❌ Server responded with status ${response.status}${COLORS.reset}\n`,
      );
      return false;
    }
  } catch (error) {
    console.log(`${COLORS.red}❌ Server is not responding${COLORS.reset}`);
    console.log(
      `${COLORS.gray}   Error: ${error instanceof Error ? error.message : String(error)}${COLORS.reset}\n`,
    );
    return false;
  }
}

function printResults(results: TestResult[]): void {
  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;
  const total = results.length;

  console.log(`\n${"=".repeat(80)}`);
  console.log(`${COLORS.cyan}📊 TEST SUMMARY${COLORS.reset}`);
  console.log(`${"=".repeat(80)}\n`);

  console.log(`${COLORS.blue}Total Tests:${COLORS.reset} ${total}`);
  console.log(
    `${COLORS.green}Passed:${COLORS.reset}      ${passed} (${((passed / total) * 100).toFixed(1)}%)`,
  );
  console.log(
    `${COLORS.red}Failed:${COLORS.reset}      ${failed} (${((failed / total) * 100).toFixed(1)}%)\n`,
  );

  // Group by status
  const passing = results.filter((r) => r.passed);
  const failing = results.filter((r) => !r.passed);

  if (passing.length > 0) {
    console.log(`${COLORS.green}✅ PASSING ENDPOINTS (${passing.length})${COLORS.reset}`);
    console.log(`${"─".repeat(80)}`);
    passing.forEach((result) => {
      const avgTime = result.responseTime
        ? `${result.responseTime}ms`
        : "N/A";
      console.log(
        `${COLORS.green}✓${COLORS.reset} ${result.method.padEnd(6)} ${result.endpoint.padEnd(45)} ${COLORS.gray}→${COLORS.reset} ${result.actualStatus} ${COLORS.gray}(${avgTime})${COLORS.reset}`,
      );
    });
    console.log();
  }

  if (failing.length > 0) {
    console.log(`${COLORS.red}❌ FAILING ENDPOINTS (${failing.length})${COLORS.reset}`);
    console.log(`${"─".repeat(80)}`);
    failing.forEach((result) => {
      console.log(
        `${COLORS.red}✗${COLORS.reset} ${result.method.padEnd(6)} ${result.endpoint}`,
      );
      console.log(
        `  ${COLORS.gray}Expected:${COLORS.reset} ${result.expectedStatus} | ${COLORS.gray}Got:${COLORS.reset} ${result.actualStatus || "N/A"}`,
      );
      if (result.error) {
        console.log(`  ${COLORS.red}Error:${COLORS.reset} ${result.error}`);
      }
      console.log();
    });
  }

  // Calculate average response time
  const responseTimes = results
    .filter((r) => r.responseTime)
    .map((r) => r.responseTime!);
  if (responseTimes.length > 0) {
    const avgResponseTime =
      responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
    console.log(`${COLORS.blue}⚡ Average Response Time:${COLORS.reset} ${avgResponseTime.toFixed(0)}ms`);
  }

  console.log(`\n${"=".repeat(80)}\n`);

  if (failed === 0) {
    console.log(
      `${COLORS.green}🎉 All tests passed! Migration successful!${COLORS.reset}\n`,
    );
  } else {
    console.log(`${COLORS.yellow}⚠️  Some tests failed. Please review the results above.${COLORS.reset}\n`);
  }
}

async function main(): Promise<void> {
  // Parse command line arguments
  const args = process.argv.slice(2);
  const withAuth = args.includes("--with-auth");
  const tokenArg = args.find((arg) => arg.startsWith("--token="));
  const token = tokenArg ? tokenArg.split("=")[1] : undefined;

  const options: TestOptions = {
    withAuth: withAuth || !!token,
    token,
  };

  const authMode = options.withAuth
    ? token
      ? "with provided JWT token"
      : "with authentication"
    : "without authentication";

  console.log(`\n${"=".repeat(80)}`);
  console.log(`${COLORS.cyan}🚀 AUTOMATED ENDPOINT TESTING${COLORS.reset}`);
  console.log(`${COLORS.gray}Testing all generated CRUD routes from migration-boilerplate${COLORS.reset}`);
  console.log(`${COLORS.yellow}Mode: ${authMode}${COLORS.reset}`);
  console.log(`${"=".repeat(80)}\n`);

  // Check server health first
  const serverHealthy = await testServerHealth();
  if (!serverHealthy) {
    console.log(
      `${COLORS.yellow}💡 Make sure the server is running with: npm run dev${COLORS.reset}\n`,
    );
    process.exit(1);
  }

  console.log(
    `${COLORS.cyan}🧪 Testing ${GENERATED_ROUTES.length} endpoints...${COLORS.reset}\n`,
  );

  const results: TestResult[] = [];

  // Determine expected status based on auth mode
  const expectedStatus = options.withAuth ? 200 : 401;

  // Test all endpoints
  for (let i = 0; i < GENERATED_ROUTES.length; i++) {
    const route = GENERATED_ROUTES[i];
    const progress = `[${(i + 1).toString().padStart(2)}/${GENERATED_ROUTES.length}]`;

    process.stdout.write(
      `${COLORS.gray}${progress}${COLORS.reset} Testing ${route}...`,
    );

    const result = await testEndpoint(route, "GET", expectedStatus, options);
    results.push(result);

    const status = result.passed
      ? `${COLORS.green}✓${COLORS.reset}`
      : `${COLORS.red}✗${COLORS.reset}`;
    const statusCode = result.actualStatus || "ERR";
    const time = result.responseTime ? `${result.responseTime}ms` : "N/A";

    process.stdout.write(
      ` ${status} ${statusCode} ${COLORS.gray}(${time})${COLORS.reset}\n`,
    );
  }

  // Print summary
  printResults(results);

  // Exit with appropriate code
  const allPassed = results.every((r) => r.passed);
  process.exit(allPassed ? 0 : 1);
}

// Run tests
main().catch((error) => {
  console.error(`${COLORS.red}Fatal error:${COLORS.reset}`, error);
  process.exit(1);
});
