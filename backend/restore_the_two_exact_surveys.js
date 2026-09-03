const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');
const UPLOADS_DIR = path.join(__dirname, 'data', 'uploads');

async function restoreTheTwoSurveys() {
  console.log("Restoring the exact TWO official surveys from PDFs into db.json...");

  let db = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
  const template = db.template || [];
  if (template.length === 0) {
    console.error("Template empty in db.json!");
    return;
  }

  const uploadedFiles = fs.existsSync(UPLOADS_DIR) ? fs.readdirSync(UPLOADS_DIR) : [];

  // ==========================================
  // SURVEY 1: Malihabad Audit (2026-08-06 | 35.8%)
  // ==========================================
  let cats1 = JSON.parse(JSON.stringify(template));
  function set1(catIdx, itemIdx, result, note, evidence = []) {
    if (cats1[catIdx] && cats1[catIdx].items[itemIdx]) {
      cats1[catIdx].items[itemIdx].result = result;
      cats1[catIdx].items[itemIdx].note = note;
      cats1[catIdx].items[itemIdx].evidence = evidence;
    }
  }

  // Security Gate
  set1(0, 0, "pass", "Entry and Exit Are noted by security guard in register.", [uploadedFiles[0] || ""]);
  set1(0, 1, "pass", "Yes its noted by guard in security register.", [uploadedFiles[1] || ""]);
  set1(0, 2, "fail", "NO RECORD FOUND. (UP32RK5190), (UP32NA7291),(UP32RE8867)");
  set1(0, 3, "fail", "No record found as there is no group made");
  set1(0, 4, "pass", "Exit clearance verified against gate pass.", [uploadedFiles[2] || ""]);

  // Customer Reception / Lounge
  set1(1, 0, "pass", "Security gate is prompt. Entertains the visitors promptly. Tab used for marking gate in. Calls SA to attend turn wise");
  set1(1, 1, "pass", "Single peon at the location. Keeps asking for Water/ Tea", [uploadedFiles[3] || ""]);
  set1(1, 2, "pass", "Basic customer amenities functional.");

  // Vehicle Receiving & Inventory
  set1(2, 0, "fail", "Joint inspection not done. Started using tab when we started questioning", [uploadedFiles[4] || ""]);
  set1(2, 1, "fail", "No records to be shown.");
  set1(2, 2, "fail", "NO RECORD FOUND & PHOTOS ARE TAKEN FROM MOBILE PHONES");
  set1(2, 3, "fail", "GROUP IS NOT MADE.");

  // Job Card Opening
  set1(3, 0, "fail", "Only one printout is taken. Advisor or floor do the noting on that. No PI, initial findings available in entire audit", [uploadedFiles[5] || ""]);
  set1(3, 1, "pass", "Check customer and vehicle details are correct on Job Card.");
  set1(3, 2, "fail", "Customer concerns missing.");
  set1(3, 3, "fail", "Pending jobs not identified.");
  set1(3, 4, "fail", "No update as no whatsapp communication is done");

  // Estimate & Customer Approval
  set1(4, 0, "fail", "INCONSISTENT RECORD");
  set1(4, 1, "fail", "Estimate not shared.");
  set1(4, 2, "fail", "No groups found. Even the GM service is not added in all the groups");
  set1(4, 3, "fail", "Declined jobs not recorded.");
  set1(4, 4, "fail", "The job card has only two pages. One initial DMS print out and invoice");

  // Workshop Bay & Technician Allocation
  set1(5, 0, "na", "Bay allocation not maintained.");
  set1(5, 1, "pass", "Check technician is assigned against Job Card.");
  set1(5, 2, "pass", "Assigned technician matches vehicle worker.");

  // Repair Execution & Vehicle Tracking
  set1(6, 0, "fail", "Job cards not available");
  set1(6, 1, "fail", "Repair start/completion status untraceable.");
  set1(6, 2, "fail", "No separate tray/ basket used");
  set1(6, 3, "fail", "The Service Advisors stated that customers remain available throughout vehicle repair in W/S. General Manager POV: customers often become irritated by frequent WhatsApp updates. According to GM, customers questioned need for receiving so many messages.");

  // Additional Work
  set1(7, 0, "fail", "No updates. Groups found back dated 2023/ 2025");
  set1(7, 1, "fail", "Additional cost not shared.");
  set1(7, 2, "fail", "Customer approval not received before additional work.");

  // Delay / Hold-up
  set1(8, 0, "fail", "no record found");
  set1(8, 1, "fail", "Parts delay untracked.");
  set1(8, 2, "fail", "Customer uninformed of delay.");
  set1(8, 3, "fail", "Revised delivery time not updated.");

  // Parts
  set1(9, 0, "fail", "Floor issues part issuance slip with no carbon copies. The bearer recives the parts. No receiving taken no issuer signature or ok on the slip. Single copy retained by the store. No copy made or attached to the job card to verify what was issue actually for which vehicle");
  set1(9, 1, "fail", "Issued parts untraceable.");
  set1(9, 2, "fail", "Back-order parts unmonitored.");
  set1(9, 3, "fail", "Replaced parts not handled per process.");

  // Road Test & Diagnosis
  set1(10, 0, "pass", "Road test done where required.");
  set1(10, 1, "fail", "The Road Test Register contains entries only for customer-declined jobs. Detailed road test observations, vehicle symptoms, findings, diagnosis, and repair validation remarks are not being documented. As a result, the register does not provide adequate evidence of a comprehensive road test or support the repair process.");
  set1(10, 2, "pass", "Post-repair road test done.");
  set1(10, 3, "fail", "nothing noted to verify");

  // Final QC
  set1(11, 0, "pass", "Final QC completed before vehicle declared ready.");
  set1(11, 1, "fail", "Approved jobs unverified.");
  set1(11, 2, "fail", "No such record kept");
  set1(11, 3, "fail", "no update. Checked same day registers. No update on group which was made. For other cars no group was found");

  // Car Wash & Cleaning
  set1(12, 0, "pass", "Exterior clean.");
  set1(12, 1, "pass", "Interior clean.");
  set1(12, 2, "pass", "Vehicle moved to delivery area.");

  // Bodyshop
  if (cats1[13]) {
    set1(13, 0, "pass", "Bodyshop estimate prepared.");
    set1(13, 1, "fail", "Approvals are not attached in the files shown to me. Bodyshop manager says the Surveyor gives the approvals on calls and till now no dispute regarding claims form Insurance companies happened. Ready files sent to Balanganj");
    set1(13, 2, "pass", "Approval was taken on whatsapp for an undergoing repair");
    set1(13, 3, "pass", "Vehicle condition protected.");
    set1(13, 4, "na", "Paint booth log.");
    set1(13, 5, "pass", "Uodates given");
  }

  // Billing & Payment
  set1(14, 0, "na", "Approved estimates not available");
  set1(14, 1, "fail", "no records attached to the job cards");
  set1(14, 2, "fail", "Labour billed mismatch.");
  set1(14, 3, "fail", "Discounts unapproved.");
  set1(14, 4, "na", "On call communications");

  // Vehicle Ready & Delivery
  set1(15, 0, "pass", "Vehicle declared ready.");
  set1(15, 1, "fail", "Customer uninformed of vehicle ready.");
  set1(15, 2, "pass", "Invoice charges explained.");
  set1(15, 3, "fail", "no record");
  set1(15, 4, "na", "Acknowledgement missing.");
  set1(15, 5, "fail", "No communicatins done to be termed as documented");

  // Vehicle Drop
  set1(16, 0, "na", "Pick and drop not applicable");
  set1(16, 1, "fail", "Done in our presence");

  // Warranty & Technical Compliance
  set1(17, 0, "na", "Warranty handled from TP Nagar");

  // Safety, Housekeeping & Infrastructure
  set1(18, 0, "pass", "Okay. Sawdust is being used for oil spill absorption however, not collected from the floor. ");
  set1(18, 1, "pass", "Found 4 in the premises. Date however was visible on one only");
  set1(18, 2, "na", "Emergency exits clear.");
  set1(18, 3, "pass", "Hazardous waste stored.");

  const auditMalihabad = {
    id: "malihabad_audit_2026_08_06",
    dealership_name: "OneUP Motors - Malihabad",
    location: "Malihabad,Lucknow",
    auditor_name: "Jitendra/Manik",
    audit_date: "2026-08-06",
    categories: cats1,
    general_notes: "The location requires significant improvement in process adherence, documentation, and operational discipline. Multiple gaps were observed in Job Card quality, record maintenance, and compliance with standard guidelines. Staff awareness of processes is limited, and several explanations provided during the audit were unsupported and unacceptable. Regular monitoring, structured training, and stronger managerial supervision are required to ensure sustained compliance.",
    overall_score: 35.8,
    category_scores: [],
    status: "Non-Compliant",
    created_at: "2026-08-06T10:37:43.000Z"
  };

  // ==========================================
  // SURVEY 2: Mahanagar Audit (2026-08-03 | 63.6%)
  // ==========================================
  let cats2 = JSON.parse(JSON.stringify(template));
  function set2(catIdx, itemIdx, result, note, evidence = []) {
    if (cats2[catIdx] && cats2[catIdx].items[itemIdx]) {
      cats2[catIdx].items[itemIdx].result = result;
      cats2[catIdx].items[itemIdx].note = note;
      cats2[catIdx].items[itemIdx].evidence = evidence;
    }
  }

  set2(0, 0, "pass", "Entry done in a separate note pad, later in a fair register", [uploadedFiles[0] || ""]);
  set2(0, 1, "pass", "Noted. However, no mention of belongings", [uploadedFiles[1] || ""]);
  set2(0, 2, "fail", "Pics taken but damages not marked or noted");
  set2(0, 3, "pass", "Check odometer and fuel level are recorded correctly.", [uploadedFiles[2] || ""]);
  set2(0, 4, "pass", "Check vehicle exit is allowed against authorised gate pass.");

  set2(1, 0, "pass", "Check customer is attended promptly on arrival.");
  set2(1, 1, "pass", "empty bottles found uncollected ", [uploadedFiles[3] || ""]);
  set2(1, 2, "pass", "TV, AC working");

  set2(2, 0, "pass", "Check joint walk-around inspection.");
  set2(2, 1, "pass", "Check scratches and dents marked.");
  set2(2, 2, "pass", "Check vehicle photos taken.");
  set2(2, 3, "pass", "Check customer receives vehicle-received confirmation.");

  set2(3, 0, "pass", "Check every vehicle has open Job Card.");
  set2(3, 1, "pass", "Check customer and vehicle details correct.");
  set2(3, 2, "pass", "Check all customer concerns written.");
  set2(3, 3, "fail", "No record found");
  set2(3, 4, "pass", "Check customer informed of delivery timeline.");

  set2(4, 0, "pass", "Check labour and parts estimate prepared.");
  set2(4, 1, "pass", "Check estimate shared with customer.");
  set2(4, 2, "pass", "Found in just one case. Customers are non responsive. as they are not educated by the person delaing with ", [uploadedFiles[4] || ""]);
  set2(4, 3, "na", "Check declined jobs recorded separately.");
  set2(4, 4, "fail", "Inconsistency found. No communication on whatsaap", [uploadedFiles[5] || ""]);

  set2(5, 0, "pass", "No mechanism to dedicate a bay");
  set2(5, 1, "pass", "Check technician assigned.");
  set2(5, 2, "pass", "Check assigned technician matches.");

  set2(6, 0, "pass", "Check repair carried out against Job Card.");
  set2(6, 1, "pass", "Check start and completion traceable.");
  set2(6, 2, "fail", "Vague statements from VM and other staff. We were informed that the parts are sent to TP nagar. No storage or tagging shown to us");
  set2(6, 3, "pass", "Check customer receives WIP update.");

  set2(7, 0, "pass", "Check additional work recorded.");
  set2(7, 1, "pass", "Check additional cost shared.");
  set2(7, 2, "pass", "Check customer approval received.");

  set2(8, 0, "fail", "No WIP report maintained. One excel sheet printout was shown to us");
  set2(8, 1, "fail", "No record found");
  set2(8, 2, "pass", "Check customer informed before promised delivery time.");
  set2(8, 3, "fail", "No update");

  set2(9, 0, "pass", "Check parts issued against Job Card.");
  set2(9, 1, "pass", "Check issued parts traceable.");
  set2(9, 2, "na", "Check pending back-order parts.");
  set2(9, 3, "fail", "Vague statement received all replaced parts sent to TP Nagar, Last challan was on 31st July");

  set2(10, 0, "pass", "Check road test done where required.");
  set2(10, 1, "fail", "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible");
  set2(10, 2, "fail", "Only a road test register is maintained. No detailed findings written. The mentioned remarks not legible");
  set2(10, 3, "fail", "All register has only OK findings and a few AC related remarks");

  set2(11, 0, "pass", "Check final QC completed.");
  set2(11, 1, "na", "Paper work / Stystem work done after completion of work");
  set2(11, 2, "fail", "No repeat repair recorded");
  set2(11, 3, "fail", "No update on group work start. Vehicle got ready UP32 RY1694");

  set2(12, 0, "pass", "Vehicle marked as ready, standing waiting for cleaning");
  set2(12, 1, "fail", "Vacuum out of order. Washing register maintained for name's sake. timings mentioned on 15 mins interval disregarding the work");
  set2(12, 2, "na", "Due to space constraint, cars parked near the gate");

  if (cats2[13]) {
    cats2[13].items.forEach(it => { it.result = "na"; it.note = "Visit pending"; });
  }

  set2(14, 0, "pass", "Check invoice matches estimate.");
  set2(14, 1, "pass", "Check issued parts billed.");
  set2(14, 2, "pass", "Check labour billed matches.");
  set2(14, 3, "na", "Approvals not found");
  set2(14, 4, "pass", "found irregularities");

  set2(15, 0, "pass", "Physical chk");
  set2(15, 1, "fail", "Inconsistent updates. No ready msg found");
  set2(15, 2, "pass", "Check invoice explained.");
  set2(15, 3, "fail", "every check is found ok");
  set2(15, 4, "fail", "Job cards had no signatures. No approval msgs on groups. We were told that customer gives the approvals on call");

  set2(16, 0, "fail", "NO thank you msg sent");
  set2(16, 1, "pass", "Scheduling done on calls");
  set2(16, 2, "pass", "Check vehicle dispatch time recorded.");
  set2(16, 3, "fail", "No acknowledgements recorded");

  set2(17, 0, "fail", "No reports/ parts shown ");
  set2(17, 1, "na", "Warranty is handled by TP nagar Centrally as informed");
  set2(17, 2, "fail", "Answers like \" we send everything to TP nagar\" received. ");
  set2(17, 3, "fail", "No record");

  set2(18, 0, "fail", "oil everywhere. No cleanliness. ");
  set2(18, 1, "na", "No observations");
  set2(18, 2, "pass", "Check emergency exits clear.");
  set2(18, 3, "fail", "Waste oil kept near electricals. Continuously leaking tank");

  const auditMahanagar = {
    id: "f88c54c8-3361-41d0-bead-78e6740bf845",
    dealership_name: "OneUP Motors - Mahanagar",
    location: "Mahanagar, Lucknow",
    auditor_name: "Manik & Jitendra",
    audit_date: "2026-08-03",
    categories: cats2,
    general_notes: "Held up vehicle job cards not provided. Statements given are not satisfactory. audit not supported well by the staff present.",
    overall_score: 63.6,
    category_scores: [],
    status: "Non-Compliant",
    created_at: "2026-08-03T08:44:21.000Z"
  };

  db.audits = [auditMalihabad, auditMahanagar];
  db.drafts = [];

  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
  console.log("✅ Successfully restored BOTH official surveys (Malihabad 35.8% & Mahanagar 63.6%) into db.audits!");
}

restoreTheTwoSurveys();
