const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function cleanDB() {
  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));

  // 1. Remove Nexa / Rajesh Verma audit
  if (db.audits) {
    db.audits = db.audits.filter(a => a.id !== '08e6592e-adc7-4892-b2a4-8cd7ccb6cf3f' && a.auditor_name !== 'Rajesh Verma (Field Auditor)' && a.dealership_name !== 'OneUP Motors Nexa');
  }

  // 2. Remove Rajesh Verma user if present
  if (db.users) {
    db.users = db.users.filter(u => u.name !== 'Rajesh Verma (Field Auditor)' && u.email !== 'auditor_1785559565042@marutinexa.com');
  }

  // 3. Clear any drafts containing Rajesh Verma
  if (db.drafts) {
    db.drafts = db.drafts.filter(d => d.meta?.auditor_name !== 'Rajesh Verma (Field Auditor)');
  }

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully removed Nexa / Rajesh Verma records from db.json!");
}

cleanDB();
