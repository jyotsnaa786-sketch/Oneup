const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function resetDrafts() {
  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  db.drafts = [];
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Cleared out auto-populated fake drafts from db.json.");
}

resetDrafts();
