const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const BASE_URL = 'http://127.0.0.1:8001';

function request(method, endpoint, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(endpoint, BASE_URL);
    const reqHeaders = { ...headers };
    let postData = null;
    if (body) {
      if (typeof body === 'string' || Buffer.isBuffer(body)) {
        postData = body;
      } else {
        postData = JSON.stringify(body);
        reqHeaders['Content-Type'] = 'application/json';
      }
      reqHeaders['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(u, { method, headers: reqHeaders }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed = data;
        try { parsed = JSON.parse(data); } catch (e) {}
        resolve({ status: res.statusCode, headers: res.headers, data: parsed });
      });
    });
    req.on('error', reject);
    if (postData) req.write(postData);
    req.end();
  });
}

function waitForServer(retries = 30) {
  return new Promise((resolve, reject) => {
    const check = (count) => {
      request('GET', '/api/ping')
        .then(r => {
          if (r.status === 200) resolve();
          else if (count > 0) setTimeout(() => check(count - 1), 300);
          else reject(new Error("Server timeout"));
        })
        .catch(() => {
          if (count > 0) setTimeout(() => check(count - 1), 300);
          else reject(new Error("Server timeout"));
        });
    };
    check(retries);
  });
}

async function runPasswordResetTests() {
  console.log('===============================================================');
  console.log('🔑 ONEUP MOTORS AUDIT SYSTEM - PASSWORD RESET VERIFICATION TEST 🔑');
  console.log('===============================================================\n');

  console.log('🚀 Launching backend server...');
  const nodeBin = path.join(__dirname, '../nodejs/node-v20.11.0-win-x64/node.exe');
  const serverProc = spawn(nodeBin, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: 8001 }
  });

  serverProc.stdout.on('data', d => console.log(`[Server]: ${d.toString().trim()}`));
  serverProc.stderr.on('data', d => console.error(`[Server Err]: ${d.toString().trim()}`));

  let passed = 0;
  let failed = 0;
  function assert(condition, testName) {
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passed++;
    } else {
      console.error(`❌ [FAIL] ${testName}`);
      failed++;
    }
  }

  try {
    await waitForServer();
    console.log('🟢 Backend server initialized on http://127.0.0.1:8001\n');
    // 1. Register a test user
    const testEmail = `auditor_reset_${Date.now()}@oneupmaruti.com`;
    const origPassword = "old_password_123";
    const regRes = await request('POST', '/api/auth/register', {
      name: "Test Auditor Reset",
      email: testEmail,
      password: origPassword
    });
    assert(regRes.status === 200, `Registered test user ${testEmail}`);

    // 2. Request Forgot Password Code
    const forgotRes = await request('POST', '/api/auth/forgot-password', { email: testEmail });
    assert(forgotRes.status === 200 && forgotRes.data.reset_code, "Forgot password endpoint generated 6-digit code");
    const code = forgotRes.data.reset_code;
    console.log(`   Received 6-digit Code: ${code}`);

    // 3. Fail reset with invalid code
    const badCodeRes = await request('POST', '/api/auth/reset-password', {
      email: testEmail,
      code: "999999",
      new_password: "new_password_456"
    });
    assert(badCodeRes.status === 400, "Reset with invalid code properly rejected (400)");

    // 4. Successfully Reset Password
    const newPassword = "new_password_456";
    const resetRes = await request('POST', '/api/auth/reset-password', {
      email: testEmail,
      code: code,
      new_password: newPassword
    });
    assert(resetRes.status === 200 && resetRes.data.access_token, "Successfully reset password with valid 6-digit code");

    // 5. Verify Login with OLD password fails
    const oldLoginRes = await request('POST', '/api/auth/login', { email: testEmail, password: origPassword });
    assert(oldLoginRes.status === 401, "Login with old password properly rejected (401)");

    // 6. Verify Login with NEW password succeeds
    const newLoginRes = await request('POST', '/api/auth/login', { email: testEmail, password: newPassword });
    assert(newLoginRes.status === 200 && newLoginRes.data.email === testEmail, "Login with NEW password authenticated successfully (200)");

    // 7. Admin Reset User Password
    const adminLogin = await request('POST', '/api/auth/login', { email: 'jyotsnaa786@gmail.com', password: 'girdhar123' });
    const adminToken = adminLogin.data.access_token;
    
    const adminResetRes = await request('POST', '/api/admin/reset-user-password', {
      user_id: regRes.data.id,
      new_password: "admin_override_789"
    }, { 'Authorization': `Bearer ${adminToken}` });
    assert(adminResetRes.status === 200, "Admin successfully reset user password via Admin Command Station");

    // 8. Verify Login with Admin-overridden password
    const adminLoginCheck = await request('POST', '/api/auth/login', { email: testEmail, password: 'admin_override_789' });
    assert(adminLoginCheck.status === 200, "User logged in with Admin-overridden password successfully");

    console.log(`\n===============================================================`);
    console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
    console.log(`===============================================================\n`);
    serverProc.kill();
    process.exit(failed > 0 ? 1 : 0);
  } catch (e) {
    console.error("Test error:", e);
    serverProc.kill();
    process.exit(1);
  } finally {
    serverProc.kill();
  }
}

runPasswordResetTests();
