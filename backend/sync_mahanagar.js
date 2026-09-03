const API = 'https://oneup-motors-audit.onrender.com/api';
const AUDIT_ID = 'f88c54c8-3361-41d0-bead-78e6740bf845';

async function syncMahanagar() {
  try {
    console.log("1. Logging in as Admin...");
    const loginRes = await fetch(`${API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'jyotsnaa786@gmail.com', password: 'girdhar123' })
    });
    const loginData = await loginRes.json();
    console.log("Login Data:", loginData.email);
    const token = loginData.access_token;
    if (!token) throw new Error("No token received");
    console.log("✅ Logged in successfully");

    const config = { headers: { Authorization: `Bearer ${token}` } };

    console.log("2. Fetching current global template...");
    const templateRes = await fetch(`${API}/audit-template`, config);
    const template = await templateRes.json();

    console.log("3. Fetching Mahanagar audit...");
    const auditRes = await fetch(`${API}/audits/${AUDIT_ID}`, config);
    const audit = await auditRes.json();

    console.log("4. Pruning removed questions...");
    const templateCatIds = new Set(template.map(c => c.category_id));
    
    let updatedCategories = audit.categories.filter(c => templateCatIds.has(c.category_id));
    let removedItemsCount = 0;

    updatedCategories = updatedCategories.map(cat => {
      const templateCat = template.find(c => c.category_id === cat.category_id);
      const templateItemIds = new Set((templateCat.items || []).map(it => it.item_id));
      
      const originalItemsCount = cat.items.length;
      cat.items = cat.items.filter(it => templateItemIds.has(it.item_id));
      removedItemsCount += (originalItemsCount - cat.items.length);
      
      return cat;
    });

    console.log(`Pruned ${audit.categories.length - updatedCategories.length} deleted categories.`);
    console.log(`Pruned ${removedItemsCount} deleted questions.`);

    console.log("5. Saving synchronized audit back to production...");
    const putPayload = { ...audit, categories: updatedCategories };

    const putRes = await fetch(`${API}/audits/${AUDIT_ID}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(putPayload)
    });
    const putData = await putRes.json();
    
    console.log("✅ Synchronized successfully! New Score:", putData.overall_score);
  } catch (err) {
    console.error("❌ Error syncing:", err.message);
  }
}

syncMahanagar();
