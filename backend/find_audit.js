const API = 'https://oneup-motors-audit.onrender.com/api';

async function findMalihabad() {
  try {
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jyotsnaa786@gmail.com', password: 'girdhar123' })
    });
    const loginData = await loginRes.json();
    const token = loginData.access_token;
    if (!token) throw new Error("Login failed");

    const auditsRes = await fetch(`${API}/audits`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const audits = await auditsRes.json();

    const malihabad = audits.find(a => a.location && a.location.toLowerCase().includes('malihabad'));
    
    if (malihabad) {
      console.log("Found Malihabad Audit!");
      console.log("ID:", malihabad.id);
      console.log("Status:", malihabad.status);
    } else {
      console.log("Could not find any audit with location 'Malihabad'. Available locations:");
      audits.forEach(a => console.log(a.location, "-", a.id));
    }

  } catch (e) {
    console.error(e);
  }
}

findMalihabad();
