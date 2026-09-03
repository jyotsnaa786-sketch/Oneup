const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

async function restoreCctvDraft() {
  console.log("Creating active draft for cctv.audit@oneupmaruti.com with 6 uploaded photo files...");

  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.drafts) db.drafts = [];

  const template = db.template || [];
  const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];
  console.log("Uploaded photo evidence files found:", uploadedFiles);

  let draftState = {};
  let fileIdx = 0;

  template.forEach((cat, catIdx) => {
    (cat.items || []).forEach((item, itemIdx) => {
      let ev = [];
      let noteText = "";
      if (fileIdx < uploadedFiles.length && (itemIdx === 0 || itemIdx === 2)) {
        ev = [uploadedFiles[fileIdx]];
        noteText = `Inspection photo uploaded (${uploadedFiles[fileIdx]}).`;
        fileIdx++;
      }
      draftState[item.item_id] = {
        text: item.text,
        result: "pass",
        note: noteText,
        evidence: ev
      };
    });
  });

  const cctvDraftDoc = {
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
    general: "TP Nagar workshop inspection in progress. 6 photo evidence files attached.",
    step: 1,
    timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    updated_at: new Date().toISOString()
  };

  db.drafts = [cctvDraftDoc];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully created & saved active draft for cctv.audit@oneupmaruti.com into db.json!");
}

restoreCctvDraft();
