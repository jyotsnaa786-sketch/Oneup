const API = 'https://oneup-motors-audit.onrender.com/api';

async function deleteAudits() {
  try {
    console.log("1. Logging in as Admin...");
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jyotsnaa786@gmail.com', password: 'girdhar123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    if (!token) throw new Error("Login failed");
    console.log("✅ Logged in successfully");

    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log("2. Fetching all audits...");
    const auditsRes = await fetch(`${API}/audits`, config);
    const audits = await auditsRes.json();

    // Find the requested audits
    const targets = audits.filter(a => {
      const isJaipur = a.dealership_name?.includes('Nexa') && a.location?.includes('Jaipur') && a.audit_date === '2026-08-01';
      const isLucknow = a.dealership_name?.includes('Arena') && a.location?.includes('Balaganj') && a.audit_date === '2026-08-01';
      return isJaipur || isLucknow;
    });

    if (targets.length === 0) {
      console.log("⚠️ Could not find any audits matching those descriptions.");
      return;
    }

    console.log(`Found ${targets.length} matching audits to delete:`);
    for (const t of targets) {
      console.log(`- ${t.dealership_name} | ${t.location} | ${t.audit_date} | ID: ${t.id}`);
      
      console.log(`Deleting ${t.id}...`);
      const delRes = await fetch(`${API}/audits/${t.id}`, {
        method: 'DELETE',
        headers: config.headers
      });
      
      if (delRes.ok) {
        console.log(`✅ Deleted successfully.`);
      } else {
        console.log(`❌ Failed to delete:`, await delRes.text());
      }
    }

  } catch (e) {
    console.error("❌ Script Error:", e.message);
  }
}

deleteAudits();
