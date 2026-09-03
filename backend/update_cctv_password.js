const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function updatePassword() {
  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const newPass = "audit123";
  const hash = bcrypt.hashSync(newPass, 10);

  let cctvUser = db.users.find(u => u.email.toLowerCase() === 'cctv.audit@oneupmaruti.com');
  if (cctvUser) {
    cctvUser.password_hash = hash;
    console.log("✅ Updated password for cctv.audit@oneupmaruti.com to audit123");
  }

  let jitendraUser = db.users.find(u => u.email.toLowerCase() === 'jitendra891@gmail.com');
  if (jitendraUser) {
    jitendraUser.password_hash = hash;
    console.log("✅ Updated password for jitendra891@gmail.com to audit123");
  }

  // Clear any lockout attempts
  db.login_attempts = {};

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Password update completed in db.json!");
}

updatePassword();
