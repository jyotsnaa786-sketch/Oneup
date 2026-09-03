const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

function computeScores(categories) {
  let catScores = [];
  let totalPass = 0;
  let totalApplicable = 0;
  for (const cat of categories) {
    const items = Array.isArray(cat.items) ? cat.items : Object.values(cat.items || {});
    let cPass = 0;
    let cApplicable = 0;
    for (const item of items) {
      if (item.result === "pass") { cPass++; cApplicable++; }
      else if (item.result === "fail") { cApplicable++; }
    }
    const pct = cApplicable ? Math.round((cPass / cApplicable) * 1000) / 10 : 0.0;
    catScores.push({
      category_id: cat.category_id || "",
      name: cat.name || "",
      score: pct,
      passed: cPass,
      applicable: cApplicable,
      total: items.length
    });
    totalPass += cPass;
    totalApplicable += cApplicable;
  }
  const overall = totalApplicable ? Math.round((totalPass / totalApplicable) * 1000) / 10 : 0.0;
  return { overall, catScores };
}

function statusFromScore(score) {
  if (score >= 90) return "Compliant";
  if (score >= 70) return "Needs Attention";
  return "Non-Compliant";
}

async function restoreMahanagarAndDraft() {
  console.log("Restoring Mahanagar Audit Report and Active Draft...");

  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  if (!db.audits) db.audits = [];
  if (!db.drafts) db.drafts = [];

  const template = db.template || [];
  if (template.length === 0) {
    console.error("Template empty in db.json!");
    return;
  }

  const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];

  // Deep clone template categories to build Mahanagar Audit
  let categories = JSON.parse(JSON.stringify(template));

  // Helper to set item result and note
  function setItem(catIdx, itemIdx, result, note, evidence = []) {
    if (categories[catIdx] && categories[catIdx].items[itemIdx]) {
      categories[catIdx].items[itemIdx].result = result;
      categories[catIdx].items[itemIdx].note = note;
      categories[catIdx].items[itemIdx].evidence = evidence;
    }
  }

  // Set default "pass" for all items
  categories.forEach(cat => {
    (cat.items || []).forEach(it => {
      it.result = "pass";
      it.note = "";
      it.evidence = [];
    });
  });

  // Apply Manik & Jitendra inspection findings
  setItem(0, 0, "pass", "Entry done in a separate note pad, later in a fair register", [uploadedFiles[0] || ""]);
  setItem(0, 1, "pass", "Noted. However, no mention of belongings");
  setItem(0, 2, "pass", "Pisc taken", [uploadedFiles[1] || ""]);

  setItem(1, 1, "pass", "Spoken to the customers present in lounge");
  setItem(1, 2, "pass", "empty bottles found uncollected ", [uploadedFiles[2] || ""]);
  setItem(1, 3, "pass", "TV, AC working");

  setItem(2, 4, "pass", "No mention of inventory however");
  setItem(2, 5, "na", "");

  setItem(3, 3, "na", "");
  setItem(3, 4, "fail", "No repeat repair record kept of shown", [uploadedFiles[3] || ""]);
  setItem(3, 5, "fail", "No record found");

  setItem(4, 4, "na", "");
  setItem(4, 5, "fail", "Inconsistency found. No communication on whatsaap");

  setItem(5, 1, "pass", "No mechanism to dedicate a bay");
  setItem(5, 5, "na", "No key register or cabinet. During repair keys are in the cars itself ");

  setItem(6, 1, "na", "System work done only at billing");
  setItem(6, 3, "na", "No list provided yet to verify");
  setItem(6, 4, "fail", "Vague statements from VM and other staff. We were informed that the parts are sent to TP nagar. No storage or tagging shown to us", [uploadedFiles[4] || ""]);
  setItem(6, 6, "fail", "No WIP report maintained");

  setItem(7, 1, "pass", "approvals taken on calls. no such record maintained sseperately");
  setItem(7, 4, "na", "Customer often nonresponsive, Checked 5 record found ok on just one");

  setItem(8, 0, "fail", "No WIP report maintained. One excel sheet printout was shown to us");
  setItem(8, 1, "na", "No WIP report maintained as informed to us by WM");
  setItem(8, 2, "fail", "");
  setItem(8, 5, "fail", "No update");

  setItem(9, 3, "na", "");
  setItem(9, 4, "fail", "No storage/ labelling found", [uploadedFiles[5] || ""]);
  setItem(9, 5, "fail", "Vague statement received all replaced parts sent to TP Nagar, Last challan was on 31st July");
  setItem(9, 6, "na", "No such record");

  setItem(10, 1, "fail", "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible");
  setItem(10, 2, "na", "");
  setItem(10, 3, "fail", "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible");
  setItem(10, 4, "fail", "All register has only OK findings and a few AC related remarks");

  setItem(11, 1, "na", "Paper work / Stystem work done after completion of work");
  setItem(11, 2, "na", "");
  setItem(11, 3, "fail", "QC List filled with all ok remarks, very often found blank");
  setItem(11, 4, "fail", "");
  setItem(11, 5, "na", "");
  setItem(11, 6, "fail", "No update on group work start. Vehicle got ready UP32 RY1694");

  setItem(12, 1, "pass", "Vehicle marked as ready, standing waiting for cleaning");
  setItem(12, 2, "fail", "Vacuum out of order. Washing register maintained for name's sake. timings mentioned on 15 mins interval disregarding the work");
  setItem(12, 4, "na", "Due to space constraint, cars parked near the gate");

  if (categories[13]) {
    categories[13].items.forEach(it => { it.result = "na"; it.note = ""; });
    setItem(13, 0, "na", "Visit pending");
  }

  setItem(14, 4, "na", "Approvals not found");
  setItem(14, 6, "na", "");
  setItem(14, 8, "pass", "found irregularities");

  setItem(15, 0, "pass", "Physical chk");
  setItem(15, 1, "na", "Due to space constraint vehicle are parked neat the gate");
  setItem(15, 2, "fail", "Inconsistent updates. No ready msg found");
  setItem(15, 3, "na", "");
  setItem(15, 5, "fail", "every check is found ok");
  setItem(15, 8, "fail", "NO thank you msg sent");

  setItem(16, 0, "pass", "Scheduling done on calls");
  setItem(16, 1, "pass", "Updates on common whatsapp group");
  setItem(16, 4, "fail", "No acknowledgements recorded");

  setItem(17, 0, "fail", "No reports/ parts shown ");
  setItem(17, 1, "fail", "");
  setItem(17, 2, "na", "");
  setItem(17, 3, "fail", "Answers like 'we send everything to TP nagar' received. ");
  setItem(17, 4, "fail", "No record");

  setItem(18, 0, "fail", "oil everywhere. No cleanliness. ");
  setItem(18, 1, "na", "");
  setItem(18, 2, "na", "No observations");
  setItem(18, 4, "na", "");
  setItem(18, 5, "fail", "No list found. WM on week off");
  setItem(18, 6, "fail", "Waste oil kept near electricals. Continuously leaking tank");
  setItem(18, 7, "na", "");

  if (categories[19]) {
    categories[19].items.forEach(it => { it.result = "na"; it.note = ""; });
  }

  const { overall, catScores } = computeScores(categories);
  const status = statusFromScore(overall);

  const mahanagarAuditDoc = {
    id: 'f88c54c8-3361-41d0-bead-78e6740bf845',
    dealership_name: 'OneUP Motors - Mahanagar',
    location: 'Mahanagar, Lucknow',
    auditor_name: 'Manik & Jitendra',
    audit_date: '2026-08-03',
    categories: categories,
    general_notes: 'Held up vehicle job cards not provided. Statements given are not satisfactory. audit not supported well by the staff present.',
    overall_score: overall,
    category_scores: catScores,
    status: status,
    created_at: new Date().toISOString()
  };

  // Remove existing instance if any and unshift restored document
  db.audits = db.audits.filter(a => a.id !== mahanagarAuditDoc.id && a.dealership_name !== 'OneUP Motors - Mahanagar');
  db.audits.unshift(mahanagarAuditDoc);

  // Also construct active draft state for seamless resumption
  let draftState = {};
  categories.forEach(cat => {
    (cat.items || []).forEach(it => {
      draftState[it.item_id] = {
        text: it.text,
        result: it.result,
        note: it.note,
        evidence: it.evidence
      };
    });
  });

  const draftDoc = {
    id: "6a6c8ca3c8557f58c23d3a27",
    user_id: "6a6c8ca3c8557f58c23d3a27",
    user_name: "OneUP Field Auditor & Admin",
    meta: {
      dealership_name: "OneUP Motors - Mahanagar",
      location: "Mahanagar, Lucknow",
      auditor_name: "Manik & Jitendra",
      audit_date: "2026-08-03"
    },
    state: draftState,
    general: "Held up vehicle job cards not provided. Statements given are not satisfactory. audit not supported well by the staff present.",
    step: 1,
    timestamp: new Date().toLocaleDateString() + " " + new Date().toLocaleTimeString(),
    updated_at: new Date().toISOString()
  };

  db.drafts = [draftDoc];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log(`✅ Successfully restored Mahanagar Audit Report (ID: ${mahanagarAuditDoc.id}, Score: ${overall}%, Status: ${status}) and Active Draft into db.json!`);
}

restoreMahanagarAndDraft();
