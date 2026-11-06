const fs = require('fs');
const path = require('path');
const xlsx = require('../backend/node_modules/xlsx');

const csvPath = path.join(__dirname, '../backend/data/updated_check_sheet.csv');
const raw = fs.readFileSync(csvPath, 'utf8');

function parseCSV(text) {
  const lines = text.trim().split('\n');
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    const cols = [];
    let cur = '';
    let inQuotes = false;
    for (let c = 0; c < line.length; c++) {
      const ch = line[c];
      if (ch === '"') {
        inQuotes = !inQuotes;
      } else if (ch === ',' && !inQuotes) {
        cols.push(cur.trim());
        cur = '';
      } else {
        cur += ch;
      }
    }
    cols.push(cur.trim());
    rows.push(cols);
  }
  return rows;
}

const rows = parseCSV(raw);

// Canonical 19 category slugs for 100% backward compatibility
const CANONICAL_SLUGS = [
  'cat_1_security_gate',
  'cat_2_customer_recept',
  'cat_3_vehicle_receivi',
  'cat_4_job_card_openin',
  'cat_5_estimate_custom',
  'cat_6_workshop_bay_te',
  'cat_7_repair_executio',
  'cat_8_additional_work',
  'cat_9_delay_hold_up',
  'cat_10_parts',
  'cat_11_road_test_diagn',
  'cat_12_final_qc',
  'cat_13_car_wash_cleani',
  'cat_14_bodyshop',
  'cat_15_billing_payment',
  'cat_16_vehicle_ready_d',
  'cat_17_vehicle_drop',
  'cat_18_warranty_techni',
  'cat_19_safety_housekee'
];

let categories = [];
let currentCategory = null;

rows.forEach((r) => {
  const catNum = r[0];
  const catName = r[1];
  const whatToCheck = r[2];
  const whereToCheck = r[3];

  if (catName && catName.trim()) {
    const idx = categories.length;
    const catId = CANONICAL_SLUGS[idx] || `cat_${idx + 1}_${catName.toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 15)}`;
    currentCategory = {
      category_id: catId,
      name: catName.trim(),
      items: []
    };
    categories.push(currentCategory);
  }

  if (whatToCheck && whatToCheck.trim() && currentCategory) {
    const itemNum = currentCategory.items.length + 1;
    const itemId = `${currentCategory.category_id}_${itemNum}`;
    let fullText = whatToCheck.trim();
    if (whereToCheck && whereToCheck.trim() && whereToCheck.toLowerCase() !== 'n/a' && whereToCheck.toLowerCase() !== 'na') {
      fullText += ` [Reference: ${whereToCheck.trim()}]`;
    }

    currentCategory.items.push({
      item_id: itemId,
      text: fullText
    });
  }
});

console.log('Generated Categories:', categories.length);
let totalItems = 0;
categories.forEach(c => {
  totalItems += c.items.length;
  console.log(` - ${c.category_id}: ${c.name} (${c.items.length} items)`);
});
console.log('Total Questions:', totalItems);

// 1. Write updated db.json
const dbPath = path.join(__dirname, '../backend/data/db.json');
const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
db.template = categories;
fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
console.log('✅ Updated backend/data/db.json with new 19 categories (128 items)!');

// 2. Generate updated Excel source template
const excelPath = path.join(__dirname, '../backend/data/template_source.xlsx');
const excelRows = [["Sr. No.", "Audit Section", "What to Check", "Where to Check / Reference", "Compliance (Yes/No/N.A.)", "Evidence / Observation"]];

categories.forEach((cat, catIdx) => {
  cat.items.forEach((item, itemIdx) => {
    const parts = item.text.split('[Reference: ');
    const what = parts[0].trim();
    const where = parts[1] ? parts[1].replace(/\]$/, '').trim() : '';
    excelRows.push([
      itemIdx === 0 ? (catIdx + 1) : '',
      itemIdx === 0 ? cat.name : '',
      what,
      where,
      '',
      ''
    ]);
  });
});

const ws = xlsx.utils.aoa_to_sheet(excelRows);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Sheet1");
xlsx.writeFile(wb, excelPath);
console.log('✅ Generated updated backend/data/template_source.xlsx!');

// 3. Connect to MongoDB Atlas and update primary_database template
const MONGODB_URI = 'mongodb+srv://oneup_admin:Oneup12345@cluster0.mmwbfr7.mongodb.net/oneup_motors_portal?retryWrites=true&w=majority&appName=Cluster0';

async function updateMongoDBCloud() {
  const { MongoClient } = require('../backend/node_modules/mongodb');
  const client = new MongoClient(MONGODB_URI);
  try {
    await client.connect();
    const collection = client.db('oneup_motors_portal').collection('persistent_state');
    const updateResult = await collection.updateOne(
      { _id: 'primary_database' },
      { $set: { 'data.template': categories, updated_at: new Date().toISOString() } }
    );
    console.log('✅ MongoDB Atlas Cloud updated successfully! Modified count:', updateResult.modifiedCount);
  } catch (err) {
    console.error('Error updating cloud DB:', err.message);
  } finally {
    await client.close();
  }
}

if (process.argv.includes('--cloud')) {
  updateMongoDBCloud();
}
