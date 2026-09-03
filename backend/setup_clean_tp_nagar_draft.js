const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

async function setupCleanTpNagarDraft() {
  console.log("Setting up clean TP Nagar survey draft for cctv.audit@oneupmaruti.com...");

  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.drafts) db.drafts = [];

  const template = db.template || [];
  const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  console.log("Uploaded photo evidence files found:", uploadedFiles);

  let draftState = {};
  let fileCounter = 0;

  template.forEach((cat, catIdx) => {
    (cat.items || []).forEach((item, itemIdx) => {
      let ev = [];
      if (fileCounter < uploadedFiles.length && (itemIdx === 0 || itemIdx === 2)) {
        ev = [uploadedFiles[fileCounter]];
        fileCounter++;
      }
      draftState[item.item_id] = {
        text: item.text,
        result: "pass",
        note: "", // Clean note field so auditor can type today's TP Nagar observations!
        evidence: ev
      };
    });
  });

  const cleanTpNagarDraft = {
    id: "cctv_tp_nagar_draft_2026_08_27",
    user_id: "cctv_auditor_user_id",
    user_email: "cctv.audit@oneupmaruti.com",
    user_name: "Jitendra & Manik (CCTV Auditor)",
    meta: {
      dealership_name: "OneUP Motors - TP Nagar",
      location: "TP Nagar, Lucknow",
      auditor_name: "Jitendra & Manik",
      audit_date: "2026-08-27"
    },
    state: draftState,
    general: "OneUP Motors TP Nagar physical inspection in progress.",
    step: 1,
    timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    updated_at: new Date().toISOString()
  };

  db.drafts = [cleanTpNagarDraft];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully created clean TP Nagar draft in db.json for cctv.audit@oneupmaruti.com!");
}

setupCleanTpNagarDraft();
