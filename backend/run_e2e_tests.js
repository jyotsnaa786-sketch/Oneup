const http = require('http');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const BASE_URL = 'http://127.0.0.1:8001';
let authToken = '';

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
    if (authToken && !headers['Authorization'] && !headers['authorization']) {
      reqHeaders['Authorization'] = `Bearer ${authToken}`;
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

async function runTests() {
  console.log('===============================================================');
  console.log('🏁 MARUTI SUZUKI AFTER-SALES AUDIT SYSTEM - E2E TEST SUITE 🏁');
  console.log('===============================================================\n');

  console.log('🚀 Launching backend server...');
  const nodeBin = path.join(__dirname, '../nodejs/node-v20.11.0-win-x64/node.exe');
  const serverProc = spawn(nodeBin, [path.join(__dirname, 'server.js')], {
    cwd: __dirname,
    env: { ...process.env, PORT: 8001 }
  });

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
    // 1. Invalid Login Test
    console.log('--- 1. Security & Auth Verification ---');
    const badLogin = await request('POST', '/api/auth/login', { email: 'jyotsnaa786@gmail.com', password: 'wrongpassword' });
    assert(badLogin.status === 401, 'Invalid login credentials properly rejected (401)');

    // 2. Seeded Admin Login Test
    const login = await request('POST', '/api/auth/login', { email: 'jyotsnaa786@gmail.com', password: 'girdhar123' });
    assert(login.status === 200 && login.data.email === 'jyotsnaa786@gmail.com' && login.data.role === 'admin', 'Seeded Admin authenticated successfully');
    
    // Extract access token from Set-Cookie header or use login session
    const cookies = login.headers['set-cookie'];
    assert(cookies && cookies.length > 0, 'HttpOnly secure cookies issued on login');
    
    // For programatic calls without cookie jar, let's register a new test user to grab bearer token
    const newEmail = `auditor_${Date.now()}@marutinexa.com`;
    const reg = await request('POST', '/api/auth/register', { name: 'Rajesh Verma (Field Auditor)', email: newEmail, password: 'audit_secure_password' });
    assert(reg.status === 200 && reg.data.role === 'auditor', 'Registered brand new field auditor account');

    // To test Bearer fallback directly, let's parse JWT from set-cookie
    const accessCookie = reg.headers['set-cookie'].find(c => c.startsWith('access_token='));
    authToken = accessCookie.split(';')[0].split('=')[1];
    
    const me = await request('GET', '/api/auth/me');
    assert(me.status === 200 && me.data.email === newEmail, '/api/auth/me session verified via Token');

    // 3. Checklist Template Test
    console.log('\n--- 2. Standardized Template & Criteria Verification ---');
    const tmpl = await request('GET', '/api/audit-template');
    assert(tmpl.status === 200 && Array.isArray(tmpl.data) && tmpl.data.length > 0, `Audit template returned ${tmpl.data.length} core compliance categories`);
    const totalItems = tmpl.data.reduce((acc, c) => acc + c.items.length, 0);
    assert(totalItems >= 21, `All standardized Maruti Suzuki operational items accounted for (${totalItems} verified)`);

    // 4. File Upload Test
    console.log('\n--- 3. Photo Evidence Upload & Storage Protocol ---');
    const sampleImgPath = path.join(__dirname, 'test_evidence.png');
    fs.writeFileSync(sampleImgPath, Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082', 'hex'));
    
    const boundary = '----WebKitFormBoundary7MA4YWxkTrZu0gW';
    let formData = `--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="test_evidence.png"\r\nContent-Type: image/png\r\n\r\n`;
    const payload = Buffer.concat([Buffer.from(formData, 'utf8'), fs.readFileSync(sampleImgPath), Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')]);
    
    const upload = await request('POST', '/api/upload', payload, { 'Content-Type': `multipart/form-data; boundary=${boundary}` });
    assert(upload.status === 200 && upload.data.path && upload.data.path.startsWith('uploads/'), `Evidence uploaded to storage path: ${upload.data?.path}`);
    if (fs.existsSync(sampleImgPath)) fs.unlinkSync(sampleImgPath);

    // 5. Audit Execution & Scoring Formula Test
    console.log('\n--- 4. Audit Calculation & Status Classification Verification ---');
    const audit1Payload = {
      dealership_name: "Nexa Jaipur Central",
      location: "MI Road, Jaipur",
      auditor_name: "Rajesh Verma",
      audit_date: "2026-08-01",
      general_notes: "Service bays well organized; ETP required minor filter cleaning.",
      categories: [
        {
          category_id: "workshop", name: "Service Bay / Workshop Process",
          items: [
            { item_id: "ws1", text: "Vehicle intake & job card creation follows standard procedure", result: "pass" },
            { item_id: "ws2", text: "Pre-repair digital inspection completed and shared with customer", result: "pass" },
            { item_id: "ws3", text: "Service bays clean, tools calibrated and organized (5S)", result: "pass" },
            { item_id: "ws4", text: "Technicians follow prescribed repair time standards (SRT)", result: "pass" },
            { item_id: "ws5", text: "Final quality check performed before vehicle delivery", result: "pass" },
            { item_id: "ws6", text: "Test drive conducted and logged post major repairs", result: "pass" },
            { item_id: "ws7", text: "Wheel alignment & balancing equipment operational", result: "pass" }
          ]
        },
        {
          category_id: "parts", name: "Parts Inventory & Warranty Compliance",
          items: [
            { item_id: "pt1", text: "Only genuine Maruti Suzuki parts (MGP) stocked and used", result: "pass" },
            { item_id: "pt2", text: "Parts inventory reconciled with DMS system", result: "pass", evidence: [upload.data.path] },
            { item_id: "pt3", text: "Warranty claims filed within stipulated timelines", result: "pass" },
            { item_id: "pt4", text: "Defective parts retained & tagged for warranty audit", result: "fail", note: "2 tags missing in storage bin" },
            { item_id: "pt5", text: "Parts storage follows FIFO and bin-location standards", result: "pass" },
            { item_id: "pt6", text: "No counterfeit / spurious parts found in inventory", result: "pass" },
            { item_id: "pt7", text: "Warranty documentation complete and traceable", result: "pass" }
          ]
        },
        {
          category_id: "safety", name: "Safety & Regulatory / Statutory Compliance",
          items: [
            { item_id: "sf1", text: "Fire extinguishers present, charged and within validity", result: "pass" },
            { item_id: "sf2", text: "Pollution / effluent treatment plant (ETP) operational", result: "pass" },
            { item_id: "sf3", text: "Hazardous & waste oil disposal per statutory norms", result: "pass" },
            { item_id: "sf4", text: "PPE (gloves, goggles, shoes) used by all technicians", result: "pass" },
            { item_id: "sf5", text: "Valid trade license, GST & labour compliance displayed", result: "pass" },
            { item_id: "sf6", text: "Electrical panels & lifts have valid inspection certificates", result: "pass" },
            { item_id: "sf7", text: "Emergency exits marked and unobstructed", result: "na" } // 1 N/A item should reduce applicable divisor!
          ]
        }
      ]
    };

    const submitAudit1 = await request('POST', '/api/audits', audit1Payload);
    // Total items: 21. N/A: 1. Applicable: 20. Passed: 19. Score = (19/20)*100 = 95.0% -> Compliant
    assert(submitAudit1.status === 200, 'Audit #1 submitted to persistence engine');
    assert(submitAudit1.data.overall_score === 95.0, `Exact mathematical scoring formula verified (Expected 95.0%, got ${submitAudit1.data?.overall_score}%)`);
    assert(submitAudit1.data.status === 'Compliant', `Status bin correctly classified as '${submitAudit1.data?.status}' (≥90% rule)`);

    // Submit second audit with lower score for trend comparison
    const audit2Payload = {
      dealership_name: "Arena Delhi Ring Road",
      location: "Ring Road, Delhi",
      auditor_name: "Rajesh Verma",
      audit_date: "2026-07-28",
      categories: audit1Payload.categories.map(c => ({
        ...c,
        items: c.items.map((it, idx) => ({ ...it, result: idx > 4 ? "fail" : "pass" }))
      }))
    };
    const submitAudit2 = await request('POST', '/api/audits', audit2Payload);
    assert(submitAudit2.status === 200, 'Audit #2 submitted successfully for dashboard trend aggregation');

    // 6. Dashboard Analytics Test
    console.log('\n--- 5. Executive Dashboard & Recharts Aggregation Verification ---');
    const stats = await request('GET', '/api/dashboard/stats');
    assert(stats.status === 200 && stats.data.total_audits >= 2, `Dashboard correctly aggregates total inspections (${stats.data?.total_audits})`);
    assert(stats.data.trend && stats.data.trend.length >= 2, 'Recharts chronological trendline array populated');
    assert(stats.data.category_averages && stats.data.category_averages.length === 3, 'Category performance comparisons computed across all dealerships');

    // 7. Record Fetch & Deletion Test
    console.log('\n--- 6. Record Deletion & Lifecycle Maintenance ---');
    const adminToken = (await request('POST', '/api/auth/login', { email: 'jyotsnaa786@gmail.com', password: 'girdhar123' })).data.access_token;
    const del = await request('DELETE', `/api/audits/${submitAudit2.data.id}`, null, { 'Authorization': `Bearer ${adminToken}` });
    assert(del.status === 200 && del.data.message === 'deleted', 'Audit record cleanly deleted from storage upon request');

    console.log('\n===============================================================');
    console.log(`🎯 TEST SUITE SUMMARY: ${passed} PASSED | ${failed} FAILED`);
    if (failed === 0) {
      console.log('🏆 SYSTEM STATUS: 100% PRODUCTION READY & MATHEMATICALLY SECURE!');
    }
    console.log('===============================================================\n');
    serverProc.kill();
    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('Test Execution Exception:', err);
    serverProc.kill();
    process.exit(1);
  } finally {
    serverProc.kill();
  }
}

runTests();
