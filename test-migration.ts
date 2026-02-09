#!/usr/bin/env node
/**
 * Automated Migration Testing Script
 * Tests all generated CRUD endpoints to verify migration success
 */

import { spawn } from "child_process";
import * as readline from "readline";

const API_BASE_URL = "http://localhost:4789";
const WAIT_FOR_SERVER = 10000; // Wait 10 seconds for server to start
const MAX_RETRIES = 3; // Retry server check 3 times

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  error?: string;
}

const results: TestResult[] = [];

// List of generated models to test
const models = [
  "aifunction",
  "aifunctionlog",
  "aifunctionversion",
  "aiprovider",
  "alternativaprocedimiento",
  "auditlog",
  "comentario",
  "cpvcodigo",
  "cpvrecomendado",
  "documento",
  "documentoevidencia",
  "documentogeneracion",
  "documentoseccion",
  "documentoversion",
  "evidencia",
  "expediente",
  "incidencia",
  "profile",
  "regla",
  "revision",
  "userrole",
  "validacion",
  "validacionevidencia",
];

async function testEndpoint(
  endpoint: string,
  method: string = "GET",
): Promise<TestResult> {
  const url = `${API_BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result: TestResult = {
      endpoint,
      method,
      status: response.status,
      success: response.ok || response.status === 401, // 401 is OK (needs auth)
    };

    results.push(result);
    return result;
  } catch (error) {
    const result: TestResult = {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    results.push(result);
    return result;
  }
}

async function waitForServer(): Promise<boolean> {
  console.log(`⏳ Waiting for server to start (${WAIT_FOR_SERVER / 1000}s initial delay)...`);
  await new Promise((resolve) => setTimeout(resolve, WAIT_FOR_SERVER));

  // Test root endpoint or any endpoint with retries
  for (let i = 0; i < MAX_RETRIES; i++) {
    try {
      console.log(`   Attempt ${i + 1}/${MAX_RETRIES} - Checking ${API_BASE_URL}/`);
      const response = await fetch(`${API_BASE_URL}/`);
      // Server is up if we get any response (even 404 is fine)
      if (response.status > 0) {
        console.log(`✅ Server is ready (status: ${response.status})\n`);
        return true;
      }
    } catch (error) {
      console.log(`   Error: ${error instanceof Error ? error.message : String(error)}`);
      if (i < MAX_RETRIES - 1) {
        console.log(`   Retrying in 3s...`);
        await new Promise((resolve) => setTimeout(resolve, 3000));
      }
    }
  }

  console.log("❌ Server not responding after all retries");
  return false;
}

async function runTests() {
  console.log("🧪 AUREA API - Automated Migration Testing");
  console.log("=".repeat(60));

  // Start server in background
  console.log("\n📦 Starting server...");
  const serverProcess = spawn("npm", ["run", "dev"], {
    shell: true,
    stdio: "pipe",
  });

  let serverOutput = "";
  let serverReady = false;

  serverProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    serverOutput += output;
    // Check if server is ready by looking for common startup messages
    if (output.includes("Server listening") || output.includes("started") || output.includes("ready")) {
      serverReady = true;
    }
  });

  serverProcess.stderr?.on("data", (data) => {
    const output = data.toString();
    serverOutput += output;
    console.error(`   Server error: ${output}`);
  });

  serverProcess.on("error", (error) => {
    console.error(`   Failed to start server process: ${error.message}`);
  });

  // Wait for server to be ready
  if (!(await waitForServer())) {
    console.error("❌ Failed to start server");
    serverProcess.kill();
    process.exit(1);
  }

  // Test all generated endpoints
  console.log("🔍 Testing Generated Endpoints");
  console.log("=".repeat(60));

  for (const model of models) {
    const endpoint = `/api/private/${model}`;
    process.stdout.write(`Testing ${endpoint}... `);

    const result = await testEndpoint(endpoint);

    if (result.success) {
      console.log(`✅ ${result.status}`);
    } else {
      console.log(`❌ ${result.status} ${result.error || ""}`);
    }
  }

  // Print summary
  console.log("\n" + "=".repeat(60));
  console.log("📊 TEST SUMMARY");
  console.log("=".repeat(60));

  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success).length;

  console.log(`✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`📈 Success Rate: ${((successful / results.length) * 100).toFixed(1)}%`);

  if (failed > 0) {
    console.log("\n❌ Failed Endpoints:");
    results
      .filter((r) => !r.success)
      .forEach((r) => {
        console.log(`   - ${r.endpoint}: ${r.error || `Status ${r.status}`}`);
      });
  }

  // Cleanup
  console.log("\n🧹 Stopping server...");
  serverProcess.kill();

  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

// Handle Ctrl+C
process.on("SIGINT", () => {
  console.log("\n\n⚠️  Test interrupted by user");
  process.exit(0);
});

runTests();
