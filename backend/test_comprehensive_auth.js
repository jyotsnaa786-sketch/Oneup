const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PORT = 8009;
const BASE_URL = `http://127.0.0.1:${PORT}`;

let passed = 0;
let failed = 0;
let testCount = 0;

function assert(condition, testName, details = "") {
  testCount++;
  const num = String(testCount).padStart(2, '0');
  if (condition) {
    passed++;
    console.log(`[PASS ${num}] ✅ ${testName}${details ? ` (${details})` : ''}`);
  } else {
    failed++;
    console.error(`[FAIL ${num}] ❌ ${testName}${details ? ` (${details})` : ''}`);
  }
}

function request(method, endpoint, body = null, token = null, headers = {}) {
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
    if (token) {
      reqHeaders['Authorization'] = `Bearer ${token}`;
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
          else reject(new Error("Server start timeout"));
        })
        .catch(() => {
          if (count > 0) setTimeout(() => check(count - 1), 300);
          else reject(new Error("Server start timeout"));
        });
    };
    check(retries);
  });
}

async function runComprehensiveTests() {
  console.log("================================================================================");
  console.log("🚀 ONEUP MOTORS - EXTENSIVE AUTHENTICATION & FUNCTIONAL TEST SUITE");
  console.log("================================================================================\n");

  const serverProc = spawn(process.execPath, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: String(PORT) }
  });

  serverProc.stderr.on('data', d => {
    // Only output if serious
    const s = d.toString();
    if (!s.includes('notice') && !s.includes('Warning')) {
      console.error('[server error]', s);
    }
  });

  try {
    await waitForServer();
    console.log("✅ Backend server online and responsive on port " + PORT + "\n");

    // -------------------------------------------------------------------------
    // GROUP 1: Core Seeded Logins
    // -------------------------------------------------------------------------
    console.log("--- GROUP 1: SEEDED ROLE AUTHENTICATIONS ---");

    // 1. Admin login
    const adminRes = await request('POST', '/api/auth/login', {
      email: 'jyotsnaa786@gmail.com',
      password: 'girdhar123'
    });
    assert(adminRes.status === 200 && adminRes.data.role === 'admin', "Executive Admin login succeeds", `role: ${adminRes.data.role}`);
    const adminToken = adminRes.data.access_token;

    // 2. Director login
    const dirRes = await request('POST', '/api/auth/login', {
      email: 'directors@oneupmaruti.com',
      password: 'director123'
    });
    assert(dirRes.status === 200 && dirRes.data.role === 'director', "Board Director login succeeds", `role: ${dirRes.data.role}`);
    const directorToken = dirRes.data.access_token;

    // 3. CCTV Auditor login
    const cctvRes = await request('POST', '/api/auth/login', {
      email: 'cctv.audit@oneupmaruti.com',
      password: 'audit123'
    });
    assert(cctvRes.status === 200 && cctvRes.data.role === 'auditor', "CCTV Field Auditor login succeeds", `role: ${cctvRes.data.role}`);
    const cctvToken = cctvRes.data.access_token;

    // -------------------------------------------------------------------------
    // GROUP 2: Email Normalization, Trimming & Case-Insensitivity
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 2: EMAIL NORMALIZATION & TRIMMING ---");

    // 4. Uppercase email
    const upperRes = await request('POST', '/api/auth/login', {
      email: 'JYOTSNAA786@GMAIL.COM',
      password: 'girdhar123'
    });
    assert(upperRes.status === 200, "Uppercase email handles case-insensitively");

    // 5. Email with leading and trailing whitespace
    const spacesRes = await request('POST', '/api/auth/login', {
      email: '   jyotsnaa786@gmail.com   ',
      password: 'girdhar123'
    });
    assert(spacesRes.status === 200, "Email with leading/trailing spaces is trimmed");

    // 6. Mixed-case director email
    const mixedRes = await request('POST', '/api/auth/login', {
      email: '  Directors@OneUpMaruti.Com  ',
      password: 'director123'
    });
    assert(mixedRes.status === 200, "Mixed-case email with spaces succeeds");

    // -------------------------------------------------------------------------
    // GROUP 3: Invalid Credentials, Rate Limiting & Account Unlock
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 3: SECURITY, RATE LIMITING & LOCKOUT RECOVERY ---");

    const attackEmail = `test_lockout_${Date.now()}@oneupmotors.in`;
    // Register test user
    await request('POST', '/api/auth/register', {
      name: "Lockout Test User",
      email: attackEmail,
      password: "correct_password_123"
    });

    // 7. Wrong password returns 401
    const badPass = await request('POST', '/api/auth/login', {
      email: attackEmail,
      password: "wrong_password"
    });
    assert(badPass.status === 401, "Invalid password returns HTTP 401");

    // 8. Consecutive failures trigger 429 lockout
    let lockedOut = false;
    for (let i = 0; i < 6; i++) {
      const res = await request('POST', '/api/auth/login', {
        email: attackEmail,
        password: "wrong_password"
      });
      if (res.status === 429) {
        lockedOut = true;
        break;
      }
    }
    assert(lockedOut, "5+ failed login attempts trigger HTTP 429 Lockout");

    // 9. Reset lockout endpoint
    const clearRes = await request('POST', '/api/auth/clear-rate-limit');
    assert(clearRes.status === 200, "POST /api/auth/clear-rate-limit succeeds");

    // 10. Login works immediately after unlock
    const reloginRes = await request('POST', '/api/auth/login', {
      email: attackEmail,
      password: "correct_password_123"
    });
    assert(reloginRes.status === 200, "User can sign in immediately after lockout clear");

    // -------------------------------------------------------------------------
    // GROUP 4: Registration, Session & Token Precedence
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 4: TOKEN PRECEDENCE & SESSION MANAGEMENT ---");

    const freshEmail = `auditor_fresh_${Date.now()}@oneupmotors.in`;
    const regRes = await request('POST', '/api/auth/register', {
      name: "  Priya Sharma  ",
      email: `  ${freshEmail}  `,
      password: "priyapassword123"
    });
    assert(regRes.status === 200 && regRes.data.email === freshEmail, "Registration trims whitespace from email and name");
    const freshToken = regRes.data.access_token;

    // 11. /api/auth/me verifies session
    const meRes = await request('GET', '/api/auth/me', null, freshToken);
    assert(meRes.status === 200 && meRes.data.email === freshEmail, "/api/auth/me verified via Authorization Bearer token");

    // 12. Token Precedence over expired cookie:
    // Pass a fake expired cookie alongside a valid Authorization Bearer header
    const precedenceRes = await request('GET', '/api/auth/me', null, freshToken, {
      'Cookie': 'access_token=expired.junk.jwt; Path=/'
    });
    assert(precedenceRes.status === 200, "Authorization Bearer token takes precedence over stale/corrupt cookie");

    // -------------------------------------------------------------------------
    // GROUP 5: Forgot Password & Verification Code Reset
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 5: SELF-SERVICE PASSWORD RESET WORKFLOW ---");

    // 13. Request reset code
    const forgotRes = await request('POST', '/api/auth/forgot-password', {
      email: `  ${freshEmail}  `
    });
    assert(forgotRes.status === 200 && forgotRes.data.reset_code && forgotRes.data.reset_code.length === 6, "Forgot password generates 6-digit verification code");
    const resetCode = forgotRes.data.reset_code;

    // 14. Reset password with code
    const resetRes = await request('POST', '/api/auth/reset-password', {
      email: freshEmail,
      code: ` ${resetCode} `,
      new_password: "brand_new_secure_pass_456"
    });
    assert(resetRes.status === 200 && resetRes.data.access_token, "Password successfully reset with code");

    // 15. Sign in with new password
    const newLoginRes = await request('POST', '/api/auth/login', {
      email: freshEmail,
      password: "brand_new_secure_pass_456"
    });
    assert(newLoginRes.status === 200, "Sign in with new updated password succeeds");

    // -------------------------------------------------------------------------
    // GROUP 6: Role-Based Access Control (RBAC) Isolation
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 6: ROLE-BASED ACCESS CONTROL (RBAC) ---");

    // 16. Auditor cannot access admin user list (403)
    const noAdminUsers = await request('GET', '/api/admin/users', null, freshToken);
    assert(noAdminUsers.status === 403, "Auditor blocked from GET /api/admin/users (403 Forbidden)");

    // 17. Admin CAN access admin user list
    const adminUsers = await request('GET', '/api/admin/users', null, adminToken);
    assert(adminUsers.status === 200 && Array.isArray(adminUsers.data), "Admin successfully accesses /api/admin/users");

    // 18. Auditor cannot modify checklist template (403)
    const noTmplEdit = await request('PUT', '/api/audit-template', [{ category_id: "fake", name: "Fake", items: [] }], freshToken);
    assert(noTmplEdit.status === 403, "Auditor blocked from PUT /api/audit-template (403 Forbidden)");

    // 19. Auditor cannot delete audits (403 Forbidden)
    const noDel = await request('DELETE', '/api/audits/nonexistent', null, freshToken);
    assert(noDel.status === 403, "Auditor blocked from DELETE /api/audits/:id (403 Forbidden)");

    // 20. Director cannot submit audit (preventDirectorEdits: 403)
    const dirSubmit = await request('POST', '/api/audits', { dealership_name: "Test", categories: [] }, directorToken);
    assert(dirSubmit.status === 403, "Director blocked from mutating audit data (View-only governance mode: 403)");

    // -------------------------------------------------------------------------
    // GROUP 7: Template, Audit Submission & Scoring Formula
    // -------------------------------------------------------------------------
    console.log("\n--- GROUP 7: TEMPLATE & AUDIT SUBMISSION WITH EXACT SCORING ---");

    // 21. Fetch template
    const tmplRes = await request('GET', '/api/audit-template', null, adminToken);
    assert(tmplRes.status === 200 && tmplRes.data.length >= 19, `Template loads ${tmplRes.data.length} categories`);

    // 22. Submit field audit
    const testAuditPayload = {
      dealership_name: "OneUP Maruti Lucknow Central",
      location: "Gomti Nagar, Lucknow",
      auditor_name: "Priya Sharma",
      audit_date: new Date().toISOString().slice(0, 10),
      general_notes: "Overall excellent compliance with MGP standards.",
      categories: [
        {
          category_id: "c1",
          name: "Service Bay Quality",
          items: [
            { item_id: "c1_1", text: "Tools calibrated", result: "pass" },
            { item_id: "c1_2", text: "Waste oil properly stored", result: "pass" },
            { item_id: "c1_3", text: "Safety equipment worn", result: "fail", note: "One technician without gloves" },
            { item_id: "c1_4", text: "Customer lounge clean", result: "pass" }
          ]
        }
      ]
    };
    const auditRes = await request('POST', '/api/audits', testAuditPayload, freshToken);
    assert(auditRes.status === 200, "Audit submitted successfully");
    // 4 items: 3 pass, 1 fail -> 75% -> Needs Attention
    assert(auditRes.data.overall_score === 75.0, `Scoring math verified: Expected 75.0%, got ${auditRes.data.overall_score}%`);
    assert(auditRes.data.status === "Needs Attention", `Bin classification verified: '${auditRes.data.status}'`);
    const createdAuditId = auditRes.data.id;

    // 23. Verify CAPA Task was auto-generated for the 1 failing item
    const tasksRes = await request('GET', '/api/tasks', null, freshToken);
    assert(tasksRes.status === 200 && Array.isArray(tasksRes.data), "Tasks list retrieved");
    const autoTask = tasksRes.data.find(t => t.audit_id === createdAuditId);
    assert(autoTask && autoTask.status === 'open', "CAPA defect task auto-generated from failed item with status 'open'");

    // 24. Rectify CAPA task
    const rectRes = await request('POST', `/api/capa/${autoTask.id}/rectify`, {
      rectification_note: "Provided fresh protective nitrile gloves to all workshop bay technicians."
    }, freshToken);
    assert(rectRes.status === 200 && rectRes.data.status === 'rectified', "CAPA task transitioned to 'rectified'");

    // 25. Auditor verifies and closes CAPA task
    const verifyRes = await request('POST', `/api/capa/${autoTask.id}/verify`, {
      approved: true,
      verification_note: "Verified in follow-up inspection. Compliance restored."
    }, freshToken);
    assert(verifyRes.status === 200 && verifyRes.data.status === 'closed', "CAPA task approved and closed by auditor");

    // 26. Admin exports binary PDF
    const pdfRes = await request('GET', `/api/audits/${createdAuditId}/pdf`, null, adminToken);
    assert(pdfRes.status === 200 && pdfRes.headers['content-type']?.includes('pdf'), "Admin compiles binary PDF Inspection Report");

    // 27. Admin exports binary Excel
    const xlsxRes = await request('GET', `/api/audits/${createdAuditId}/excel`, null, adminToken);
    assert(xlsxRes.status === 200, "Admin compiles binary Excel spreadsheet");

    // 28. Clean up created audit
    const delRes = await request('DELETE', `/api/audits/${createdAuditId}`, null, adminToken);
    assert(delRes.status === 200, "Admin cleanly deletes audit record");

    console.log("\n================================================================================");
    console.log(`🎯 EXTENSIVE SUITE RESULTS: ${passed} PASSED | ${failed} FAILED (out of ${testCount} tests)`);
    console.log("================================================================================\n");

    serverProc.kill();
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error("Critical test runner exception:", err);
    serverProc.kill();
    process.exit(1);
  } finally {
    serverProc.kill();
  }
}

runComprehensiveTests();
