const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

async function convertToDraft() {
  console.log("Converting TP Nagar audit from Submitted to Active Draft for cctv.audit@oneupmaruti.com...");

  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.users) db.users = [];
  if (!db.audits) db.audits = [];
  if (!db.drafts) db.drafts = [];

  const AUDITOR_EMAIL = 'cctv.audit@oneupmaruti.com';
  const AUDITOR_PASS = 'girdhar123';
  const AUDITOR_ID = 'cctv_auditor_user_id';

  // 1. Seed/ensure cctv.audit@oneupmaruti.com user exists
  let auditorUser = db.users.find(u => u.email.toLowerCase() === AUDITOR_EMAIL.toLowerCase());
  if (!auditorUser) {
    const hash = bcrypt.hashSync(AUDITOR_PASS, 10);
    auditorUser = {
      id: AUDITOR_ID,
      email: AUDITOR_EMAIL,
      name: "Jitendra & Manik (CCTV Auditor)",
      role: "auditor",
      password_hash: hash,
      created_at: new Date().toISOString()
    };
    db.users.push(auditorUser);
    console.log("✅ Created user account for:", AUDITOR_EMAIL);
  } else {
    auditorUser.password_hash = bcrypt.hashSync(AUDITOR_PASS, 10);
    console.log("✅ Updated password for user:", AUDITOR_EMAIL);
  }

  // 2. Find and REMOVE submitted TP Nagar audit from db.audits
  const tpSubmittedAudit = db.audits.find(a => a.dealership_name.includes("TP Nagar"));
  db.audits = db.audits.filter(a => !a.dealership_name.includes("TP Nagar") && a.id !== 'b93cb193-b0a0-43a0-bdc8-498b47281162');
  console.log("✅ Removed TP Nagar audit from Submitted Audits list.");

  // 3. Build draft state from categories / template with all 6 uploaded photo attachments
  const template = db.template || [];
  const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  console.log("Uploaded photo evidence files:", uploadedFiles);

  let draftState = {};
  let fileCounter = 0;

  if (tpSubmittedAudit && tpSubmittedAudit.categories) {
    tpSubmittedAudit.categories.forEach(cat => {
      (cat.items || []).forEach(it => {
        draftState[it.item_id] = {
          text: it.text,
          result: it.result || "pass",
          note: it.note || "Verified compliant by CCTV auditor.",
          evidence: it.evidence && it.evidence.length > 0 ? it.evidence : []
        };
      });
    });
  } else {
    template.forEach(cat => {
      (cat.items || []).forEach((it, itemIdx) => {
        let ev = [];
        if (fileCounter < uploadedFiles.length && (itemIdx === 0 || itemIdx === 2)) {
          ev = [uploadedFiles[fileCounter]];
          fileCounter++;
        }
        draftState[it.item_id] = {
          text: it.text,
          result: "pass",
          note: "Verified compliant by CCTV auditor.",
          evidence: ev
        };
      });
    });
  }

  // Create draft document accessible by cctv.audit@oneupmaruti.com and Admin
  const draftDoc = {
    id: "tp_nagar_draft_2026_08_27",
    user_id: auditorUser.id,
    user_email: AUDITOR_EMAIL,
    user_name: auditorUser.name,
    meta: {
      dealership_name: "OneUP Motors - TP Nagar",
      location: "TP Nagar, Lucknow",
      auditor_name: "Jitendra & Manik",
      audit_date: "2026-08-27"
    },
    state: draftState,
    general: "Physical audit in progress at OneUP Motors TP Nagar. 6 photo evidence files attached.",
    step: 1,
    timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    updated_at: new Date().toISOString()
  };

  db.drafts = [draftDoc];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully moved TP Nagar audit to DRAFT for cctv.audit@oneupmaruti.com!");
}

convertToDraft();
