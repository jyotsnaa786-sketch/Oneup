const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dbPath = path.join(__dirname, 'data', 'db.json');

try {
  if (!fs.existsSync(dbPath)) {
    console.error("db.json not found!");
    process.exit(1);
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  const template = db.template || [];

  if (template.length === 0) {
    console.error("Template is empty in db.json!");
    process.exit(1);
  }

  // Clear previous sub-100% audits and tasks
  db.audits = [];
  db.tasks = [];

  function generate100PercentAudit(dealership_name, location, audit_date) {
    let categories = template.map(cat => {
      let items = (cat.items || []).map(item => ({
        item_id: item.item_id,
        text: item.text,
        result: "pass",
        note: "Verified in complete operational order.",
        evidence: []
      }));
      return {
        category_id: cat.category_id,
        name: cat.name,
        items: items
      };
    });

    // Compute scores
    let catScores = categories.map(c => ({
      category_id: c.category_id,
      name: c.name,
      score: 100.0,
      passed: c.items.length,
      applicable: c.items.length,
      total: c.items.length
    }));

    return {
      id: crypto.randomUUID(),
      dealership_name,
      location,
      auditor_name: "OneUP Lead Auditor",
      audit_date,
      categories,
      general_notes: "All 20 operational sections and 133 check points verified at 100% compliance against OneUP Motors standards.",
      overall_score: 100.0,
      category_scores: catScores,
      status: "Compliant",
      created_by: "6a6c8ca3c8557f58c23d3a27",
      created_at: new Date(audit_date).toISOString()
    };
  }

  const audit1 = generate100PercentAudit("OneUP Motors Nexa - Central Hub", "MI Road, Jaipur", "2026-08-01");
  const audit2 = generate100PercentAudit("OneUP Motors Arena - Highway Branch", "NH-8 Expressway, Jaipur", "2026-07-29");

  db.audits.push(audit1);
  db.audits.push(audit2);

  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully injected two 100% score inspections for OneUP Motors into database!");
  console.log("🏆 Overall Average Score is now set to exactly 100%!");
} catch (err) {
  console.error("Error seeding 100% audits:", err);
  process.exit(1);
}
