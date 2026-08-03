const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const excelPath = "C:\\Users\\jyots_iz\\OneDrive\\Documents\\Physical Audit Chk Sheet.xlsx";
const dbPath = path.join(__dirname, 'data', 'db.json');
const serverJsPath = path.join(__dirname, 'server.js');

try {
  const workbook = xlsx.readFile(excelPath);
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

  let categories = [];
  let currentCategory = null;
  let catCounter = 0;
  let itemCounter = 0;

  // Skip header (row 0)
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const section = String(row[1]).trim();
    const whatToCheck = String(row[2]).trim();
    const whereToCheck = String(row[3]).trim();

    if (!section && !whatToCheck) continue;

    // When section is non-empty, start a brand new Category
    if (section) {
      catCounter++;
      const catId = `cat_${catCounter}_${section.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 15)}`;
      currentCategory = {
        category_id: catId,
        name: section,
        items: []
      };
      categories.push(currentCategory);
    }

    if (whatToCheck && currentCategory) {
      itemCounter++;
      const itemId = `${currentCategory.category_id}_${currentCategory.items.length + 1}`;
      let fullText = whatToCheck;
      if (whereToCheck && whereToCheck.toLowerCase() !== "n/a" && whereToCheck.toLowerCase() !== "na") {
        fullText += ` [Reference / Source: ${whereToCheck}]`;
      }
      currentCategory.items.push({
        item_id: itemId,
        text: fullText
      });
    }
  }

  console.log(`\n🎉 Successfully parsed Excel spreadsheet!`);
  console.log(`📊 Imported Categories (${categories.length}):`);
  categories.forEach((c, idx) => {
    console.log(`  ${idx + 1}. [${c.category_id}] ${c.name} (${c.items.length} checklist items)`);
  });
  console.log(`\n🔢 Total Operational Inspection Items Imported: ${itemCounter}`);

  // 1. Update active db.json persistence file
  if (fs.existsSync(dbPath)) {
    const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
    db.template = categories;
    fs.writeFileSync(dbPath, JSON.stringify(db, null, 2), 'utf8');
    console.log(`✅ Updated active database template in data/db.json!`);
  } else {
    console.warn(`⚠️ db.json not found yet, skipping DB direct inject.`);
  }

  // 2. Update DEFAULT_TEMPLATE in server.js so clean restarts use this template
  let serverCode = fs.readFileSync(serverJsPath, 'utf8');
  const startTag = 'const DEFAULT_TEMPLATE = [';
  const startIdx = serverCode.indexOf(startTag);
  if (startIdx !== -1) {
    // find end of DEFAULT_TEMPLATE declaration
    const endTag = '];\n\nlet db =';
    const endIdx = serverCode.indexOf(endTag, startIdx);
    if (endIdx !== -1) {
      const newDeclaration = `const DEFAULT_TEMPLATE = ${JSON.stringify(categories, null, 2)}`;
      const updatedCode = serverCode.substring(0, startIdx) + newDeclaration + serverCode.substring(endIdx + 1);
      fs.writeFileSync(serverJsPath, updatedCode, 'utf8');
      console.log(`✅ Permanently baked Excel template into server.js default schema!`);
    } else {
      console.warn('⚠️ Could not locate exact ending of DEFAULT_TEMPLATE in server.js');
    }
  } else {
    console.warn('⚠️ Could not locate start of DEFAULT_TEMPLATE in server.js');
  }

} catch (e) {
  console.error('Fatal import error:', e);
  process.exit(1);
}
