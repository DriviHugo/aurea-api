/**
 * Migration Endpoint Testing Script
 *
 * This script automatically:
 * 1. Starts the development server
 * 2. Waits for it to be ready
 * 3. Tests all generated CRUD endpoints
 * 4. Shuts down the server
 *
 * Success criteria:
 * - 401 (Unauthorized): Endpoint exists and is properly protected ✓
 * - 200-299 (OK): Endpoint accessible (shouldn't happen without auth)
 * - 404 (Not Found): Endpoint missing or not registered ✗
 * - 0 (Connection failed): Server not running or connection issues ✗
 */

import { spawn, type ChildProcess } from "child_process";

const PORT = 4789;
const BASE_URL = `http://localhost:${PORT}`;
const STARTUP_TIMEOUT = 30000; // 30 seconds
const HEALTH_CHECK_INTERVAL = 500; // 500ms

interface TestResult {
  endpoint: string;
  status: number;
  success: boolean;
  error?: string;
}

// List of generated endpoints to test (update this list after migration)
const ENDPOINTS_TO_TEST: string[] = [
  // Add your generated endpoint names here
  // Example: 'user', 'post', 'comment', etc.
];

let serverProcess: ChildProcess | null = null;

async function waitForServer(maxWaitMs: number): Promise<boolean> {
  const startTime = Date.now();

  while (Date.now() - startTime < maxWaitMs) {
    try {
      const response = await fetch(`${BASE_URL}/health`);
      if (response.ok) {
        console.log("✅ Server is ready");
        return true;
      }
    } catch {
      // Server not ready yet
    }
    await new Promise((resolve) => setTimeout(resolve, HEALTH_CHECK_INTERVAL));
  }

  return false;
}

async function testEndpoint(endpoint: string): Promise<TestResult> {
  try {
    const response = await fetch(`${BASE_URL}/api/private/${endpoint}`);

    return {
      endpoint,
      status: response.status,
      // Success criteria:
      // - 401: endpoint exists and is properly protected ✓
      // - 200-299: endpoint accessible (shouldn't happen without auth)
      // - 404: endpoint missing ✗
      success: response.status === 401 || response.ok,
    };
  } catch (error) {
    return {
      endpoint,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

function startServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    console.log("🚀 Starting development server...");

    serverProcess = spawn("npm", ["run", "dev"], {
      stdio: "pipe",
      shell: true,
      env: { ...process.env, NODE_ENV: "development" },
    });

    if (!serverProcess.stdout || !serverProcess.stderr) {
      reject(new Error("Failed to capture server output"));
      return;
    }

    serverProcess.stdout.on("data", (data) => {
      const output = data.toString();
      console.log(`[SERVER] ${output.trim()}`);
    });

    serverProcess.stderr.on("data", (data) => {
      const output = data.toString();
      console.error(`[SERVER ERROR] ${output.trim()}`);
    });

    serverProcess.on("error", (error) => {
      reject(error);
    });

    serverProcess.on("exit", (code) => {
      if (code !== 0 && code !== null) {
        console.error(`❌ Server exited with code ${code}`);
      }
    });

    // Give the server a moment to start
    setTimeout(resolve, 2000);
  });
}

function stopServer(): void {
  if (serverProcess) {
    console.log("\n🛑 Stopping server...");
    serverProcess.kill();
    serverProcess = null;
  }
}

async function runTests() {
  try {
    // Start the server
    await startServer();

    // Wait for server to be ready
    console.log("⏳ Waiting for server to be ready...");
    const isReady = await waitForServer(STARTUP_TIMEOUT);

    if (!isReady) {
      throw new Error("Server failed to start within timeout period");
    }

    // Test all endpoints
    console.log("\n📋 Testing generated endpoints...\n");

    if (ENDPOINTS_TO_TEST.length === 0) {
      console.log("⚠️  No endpoints configured for testing.");
      console.log(
        "   Update the ENDPOINTS_TO_TEST array in this script with your generated endpoint names.",
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
            ? "Connection failed"
            : result.status === 404
              ? "Not found"
              : `Status ${result.status}`;

      console.log(`${emoji} ${endpoint}: ${statusText}`);

      if (result.error) {
        console.log(`   Error: ${result.error}`);
      }
    }

    // Summary
    console.log("\n" + "=".repeat(60));
    const successful = results.filter((r) => r.success).length;
    const failed = results.filter((r) => !r.success).length;
    const protectedCount = results.filter((r) => r.status === 401).length;

    console.log("📊 Results:");
    console.log(`   ${successful}/${results.length} success`);
    console.log(`   ${protectedCount} protected`);
    console.log(`   ${failed} failed`);

    if (failed > 0) {
      console.log(
        "\n❌ Some endpoints failed. Check the output above for details.",
      );
      process.exitCode = 1;
    } else {
      console.log("\n✅ All endpoints are working correctly!");
    }
  } catch (error) {
    console.error("\n❌ Test failed:", error);
    process.exitCode = 1;
  } finally {
    stopServer();
  }
}

// Handle cleanup on exit
process.on("SIGINT", () => {
  stopServer();
  process.exit();
});

process.on("SIGTERM", () => {
  stopServer();
  process.exit();
});

runTests();
