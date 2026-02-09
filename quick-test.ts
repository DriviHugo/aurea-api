/**
 * Quick Endpoint Test
 *
 * Quickly test all generated endpoints (assumes server is already running)
 * Usage: npx tsx quick-test.ts
 */

const BASE_URL = "http://localhost:4789";

// List of generated endpoints to test (update this list after migration)
const ENDPOINTS_TO_TEST: string[] = [
  // Add your generated endpoint names here
  // Example: 'user', 'post', 'comment', etc.
];

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
}

async function testEndpoint(endpoint: string): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}/api/private/${endpoint}`);
    return {
      endpoint,
      status: response.status,
      success: response.status === 401 || response.ok,
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      success: false,
    };
  }
}

async function runTests() {
  console.log("🧪 Quick Endpoint Test (server must be running)\n");

  if (ENDPOINTS_TO_TEST.length === 0) {
    console.log("⚠️  No endpoints configured for testing.");
    console.log("   Update the ENDPOINTS_TO_TEST array in this script.");
    console.log(
      "\n💡 Tip: After running migration, add your endpoint names to the array.",
    );
    return;
  }

  const results: TestResult[] = [];

  for (const endpoint of ENDPOINTS_TO_TEST) {
    const result = await testEndpoint(endpoint);
    results.push(result);

    const emoji = result.status === 401 ? "🔒" : result.success ? "✅" : "❌";
    const statusText =
      result.status === 401
        ? "Protected"
        : result.status === 0
          ? "Failed"
          : `${result.status}`;

    console.log(`${emoji} ${endpoint}: ${result.status} (${statusText})`);
  }

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;
  const protectedCount = results.filter((r) => r.status === 401).length;

  console.log(
    `\n📊 Results: ${successful}/${results.length} success (${protectedCount} protected), ${failed} failed`,
  );
}

runTests().catch(console.error);
