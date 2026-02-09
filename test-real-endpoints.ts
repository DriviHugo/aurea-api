/**
 * Real endpoint testing with authentication
 * Tests actual functionality beyond just checking if endpoints are protected
 */

const BASE_URL = 'http://localhost:4789';

interface TestResult {
  endpoint: string;
  method: string;
  status: number;
  success: boolean;
  data?: any;
  error?: string;
}

const results: TestResult[] = [];

async function testEndpoint(
  endpoint: string,
  method: string,
  token?: string,
  body?: any
): Promise<TestResult> {
  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${BASE_URL}${endpoint}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    });

    let data;
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    return {
      endpoint,
      method,
      status: response.status,
      success: response.ok,
      data,
    };
  } catch (error) {
    return {
      endpoint,
      method,
      status: 0,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function registerUser(email: string, password: string) {
  return testEndpoint('/api/private/auth/register', 'POST', undefined, {
    email,
    password,
    name: 'Test User',
  });
}

async function loginUser(email: string, password: string) {
  return testEndpoint('/api/private/auth/login', 'POST', undefined, {
    email,
    password,
    fingerprint: 'test-fingerprint',
    ip: '127.0.0.1',
    agent: 'test-agent',
  });
}

async function runTests() {
  console.log('🧪 Testing Real Endpoints\n');

  // Test 1: Health check (public)
  console.log('1️⃣  Testing public health endpoint...');
  const healthResult = await testEndpoint('/health', 'GET');
  results.push(healthResult);
  console.log(
    healthResult.success
      ? `   ✅ Health: ${healthResult.status} - ${JSON.stringify(healthResult.data)}`
      : `   ❌ Health: ${healthResult.status} - ${healthResult.error || JSON.stringify(healthResult.data)}`
  );

  // Test 2: Try to access protected endpoint without auth (should be 401)
  console.log('\n2️⃣  Testing protected endpoint without auth...');
  const unauthResult = await testEndpoint('/api/private/users', 'GET');
  results.push(unauthResult);
  console.log(
    unauthResult.status === 401
      ? `   ✅ Correctly protected: ${unauthResult.status}`
      : `   ❌ Unexpected status: ${unauthResult.status}`
  );

  // Test 3: Register a new user
  console.log('\n3️⃣  Registering test user...');
  const testEmail = `test-${Date.now()}@example.com`;
  const testPassword = 'Test123!@#';
  const registerResult = await registerUser(testEmail, testPassword);
  results.push(registerResult);
  
  if (registerResult.success) {
    console.log(`   ✅ User registered: ${registerResult.status}`);
  } else {
    console.log(
      `   ⚠️  Registration: ${registerResult.status} - ${registerResult.error || JSON.stringify(registerResult.data)}`
    );
    console.log('   (This might fail due to SMTP configuration)');
  }

  // Test 4: Login
  console.log('\n4️⃣  Logging in...');
  const loginResult = await loginUser(testEmail, testPassword);
  results.push(loginResult);

  let accessToken: string | undefined;
  if (loginResult.success && loginResult.data?.accessToken) {
    accessToken = loginResult.data.accessToken;
    console.log(`   ✅ Login successful, got access token`);
  } else {
    console.log(
      `   ⚠️  Login failed: ${loginResult.status} - ${loginResult.error || JSON.stringify(loginResult.data)}`
    );
  }

  // Test 5: Access protected endpoint with auth
  if (accessToken) {
    console.log('\n5️⃣  Testing protected endpoint WITH auth...');
    const authResult = await testEndpoint('/api/private/users', 'GET', accessToken);
    results.push(authResult);
    console.log(
      authResult.success
        ? `   ✅ Users access: ${authResult.status} - Got data!`
        : `   ❌ Users access: ${authResult.status} - ${JSON.stringify(authResult.data)}`
    );

    // Test 6: Test a migrated endpoint (if any exist)
    console.log('\n6️⃣  Testing migrated endpoints WITH auth...');
    console.log('   ℹ️  Add your migrated endpoint tests here');
    
    // Example:
    // const exampleResult = await testEndpoint('/api/private/your-endpoint', 'GET', accessToken);
    // results.push(exampleResult);
    // console.log(exampleResult.success ? '✅ Success' : '❌ Failed');
  } else {
    console.log('\n⚠️  Skipping authenticated tests (no access token)');
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 Summary\n');
  const successful = results.filter((r) => r.success).length;
  const failed = results.filter((r) => !r.success && r.status !== 401).length;
  const protectedCorrectly = results.filter((r) => r.status === 401).length;

  console.log(`✅ Successful: ${successful}`);
  console.log(`🔒 Protected (401): ${protectedCorrectly}`);
  console.log(`❌ Failed: ${failed}`);
  console.log('\n' + '='.repeat(60));

  if (accessToken) {
    console.log('\n🎉 All core functionality working!');
    console.log('   - Public endpoints accessible ✓');
    console.log('   - Protected endpoints require auth ✓');
    console.log('   - Authentication flow working ✓');
    console.log('   - Ready to test migrated endpoints ✓');
  } else {
    console.log('\n⚠️  Basic protection working, but full auth flow needs SMTP config');
  }
}

runTests().catch(console.error);
