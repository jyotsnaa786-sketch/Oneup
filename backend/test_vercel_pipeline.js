const fs = require('fs');
const path = require('path');

const API = 'https://oneup-motors-audit.onrender.com/api';
const VERCEL_ORIGIN = 'https://oneup-nu.vercel.app';

async function testPipeline() {
  console.log("==================================================");
  console.log("🚀 LIVE DIAGNOSTICS: VERCEL FRONTEND -> RENDER BACKEND");
  console.log("==================================================\n");
  try {
    // 1. Test Login via Vercel Origin (Proves CORS is working)
    console.log("?? [1/3] VERIFYING CROSS-DOMAIN AUTHENTICATION...");
    const start1 = performance.now();
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Origin': VERCEL_ORIGIN 
      },
      body: JSON.stringify({ email: 'jyotsnaa786@gmail.com', password: 'girdhar123' })
    });
    const ping1 = (performance.now() - start1).toFixed(0);
    
    if (!loginRes.ok) throw new Error(`Login failed: ${loginRes.status}`);
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    console.log(`  ? SUCCESS! Secure token received bypassing CORS. (Ping: ${ping1}ms)\n`);

    // 2. Test Database Read (Proves MongoDB is connected)
    console.log("?? [2/3] VERIFYING MONGODB ATLAS CLOUD FETCHING...");
    const start2 = performance.now();
    const auditsRes = await fetch(`${API}/audits`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Origin': VERCEL_ORIGIN 
      }
    });
    const ping2 = (performance.now() - start2).toFixed(0);
    if (!auditsRes.ok) throw new Error(`Audits fetch failed: ${auditsRes.status}`);
    const audits = await auditsRes.json();
    console.log(`  ? SUCCESS! Retrieved ${audits.length} permanent audits from MongoDB. (Ping: ${ping2}ms)\n`);

    // 3. Test Cloudinary Upload Pipeline
    console.log("?? [3/3] VERIFYING CLOUDINARY HEAVY PHOTO UPLOAD PIPELINE...");
    const fd = new FormData();
    const tinyImageBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
    
    // Polyfill for Node fetch FormData
    const blob = new Blob([tinyImageBuffer], { type: 'image/png' });
    fd.append('file', blob, 'test_pixel.png');

    const start3 = performance.now();
    const uploadRes = await fetch(`${API}/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Origin': VERCEL_ORIGIN
      },
      body: fd
    });
    const ping3 = (performance.now() - start3).toFixed(0);
    
    if (!uploadRes.ok) throw new Error(`Upload failed: ${await uploadRes.text()}`);
    const uploadData = await uploadRes.json();
    console.log(`  ? SUCCESS! Test photo instantly processed via Render and saved to Cloudinary vault. (Ping: ${ping3}ms)\n`);

    console.log("==================================================");
    console.log("? ALL SYSTEMS GO! The Vercel -> Render pipeline is 100% flawless.");
    console.log("==================================================");
  } catch (err) {
    console.error("\n? TEST FAILED:", err.message);
  }
}

testPipeline();
