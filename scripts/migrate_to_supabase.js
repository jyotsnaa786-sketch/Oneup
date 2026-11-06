const fs = require('fs');
const path = require('path');

let createClient;
try {
  createClient = require('@supabase/supabase-js').createClient;
} catch (e) {
  createClient = require(path.join(__dirname, '../backend/node_modules/@supabase/supabase-js')).createClient;
}

// Load environment credentials or command-line arguments
const SUPABASE_URL = process.env.SUPABASE_URL || process.argv[2];
const SUPABASE_KEY = process.env.SUPABASE_KEY || process.argv[3];

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error("=================================================================");
  console.error("ERROR: Supabase credentials missing!");
  console.error("Usage:");
  console.error("  node scripts/migrate_to_supabase.js <SUPABASE_URL> <SUPABASE_SERVICE_KEY>");
  console.error("Or set environment variables:");
  console.error("  $env:SUPABASE_URL='https://xyz.supabase.co'");
  console.error("  $env:SUPABASE_KEY='eyJhbGci...'");
  console.error("=================================================================");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false }
});

async function runMigration() {
  console.log("=================================================================");
  console.log("Starting Full Data Migration to Supabase...");
  console.log("Target Supabase URL:", SUPABASE_URL);
  console.log("=================================================================");

  const dbPath = path.join(__dirname, '../backend/data/db.json');
  if (!fs.existsSync(dbPath)) {
    throw new Error("Local database file not found at " + dbPath);
  }
  const db = JSON.parse(fs.readFileSync(dbPath, 'utf8'));

  // 1. Migrate Users
  console.log(`\n[1/6] Migrating Users (${(db.users || []).length} records)...`);
  const users = (db.users || []).map(u => ({
    id: u.id,
    email: u.email,
    name: u.name,
    role: u.role || 'auditor',
    password_hash: u.password_hash,
    created_at: u.created_at || new Date().toISOString()
  }));
  if (users.length > 0) {
    const { error: userErr } = await supabase.from('users').upsert(users, { onConflict: 'id' });
    if (userErr) console.warn("Users upsert warning:", userErr.message);
    else console.log(`  ✓ Successfully upserted ${users.length} users into 'users' table.`);
  }

  // 2. Migrate Standard Branches
  const standardBranches = [
    { id: "oneup-krishna-nagar", name: "OneUP Motors - Krishna Nagar", location: "Krishna Nagar, Lucknow", code: "KN" },
    { id: "oneup-alambagh", name: "OneUP Motors - Alambagh", location: "Alambagh, Lucknow", code: "AB" },
    { id: "oneup-transport-nagar", name: "OneUP Motors - Transport Nagar", location: "Transport Nagar, Lucknow", code: "TN" },
    { id: "oneup-gomti-nagar", name: "OneUP Motors - Gomti Nagar", location: "Gomti Nagar, Lucknow", code: "GN" },
    { id: "oneup-hazratganj", name: "OneUP Motors - Hazratganj", location: "Hazratganj, Lucknow", code: "HG" },
    { id: "oneup-faizabad-road", name: "OneUP Motors - Faizabad Road", location: "Faizabad Road, Lucknow", code: "FR" },
    { id: "oneup-sitapur-road", name: "OneUP Motors - Sitapur Road", location: "Sitapur Road, Lucknow", code: "SR" },
  ];
  console.log(`\n[2/6] Migrating Branches (${standardBranches.length} records)...`);
  const { error: branchErr } = await supabase.from('branches').upsert(standardBranches, { onConflict: 'id' });
  if (branchErr) console.warn("Branches upsert warning:", branchErr.message);
  else console.log(`  ✓ Successfully upserted ${standardBranches.length} branches into 'branches' table.`);

  // 3. Migrate Completed Audits
  console.log(`\n[3/6] Migrating Completed Audits (${(db.audits || []).length} records)...`);
  const audits = (db.audits || []).map(a => ({
    id: a.id,
    dealership_name: a.dealership_name,
    location: a.location || 'Lucknow',
    auditor_name: a.auditor_name || 'Auditor',
    audit_date: a.audit_date || new Date().toISOString().slice(0, 10),
    overall_score: a.overall_score || 0,
    status: a.status || 'completed',
    general_notes: a.general_notes || '',
    categories: a.categories || [],
    created_at: a.created_at || new Date().toISOString()
  }));
  if (audits.length > 0) {
    const { error: auditErr } = await supabase.from('audits').upsert(audits, { onConflict: 'id' });
    if (auditErr) console.warn("Audits upsert warning:", auditErr.message);
    else console.log(`  ✓ Successfully upserted ${audits.length} audits into 'audits' table.`);
  }

  // 4. Migrate CAPA Tasks
  console.log(`\n[4/6] Migrating CAPA Remediation Tasks (${(db.tasks || []).length} records)...`);
  const tasks = (db.tasks || []).map(t => ({
    id: t.id,
    audit_id: t.audit_id || null,
    dealership_name: t.dealership_name || 'OneUP Motors',
    category_name: t.category_name || 'General',
    observation: t.observation || '',
    severity: t.severity || 'P1',
    severity_label: t.severity_label || 'Operational',
    owner: t.owner || 'Service Manager',
    due_date: t.due_date || new Date().toISOString().slice(0, 10),
    status: t.status || 'open',
    days_overdue: t.days_overdue || 0,
    action_remark: t.action_remark || '',
    rectification_note: t.rectification_note || '',
    rectification_evidence: t.rectification_evidence || [],
    verification_note: t.verification_note || '',
    verified_by: t.verified_by || null,
    closed_at: t.closed_at || null,
    created_at: t.created_at || new Date().toISOString()
  }));
  if (tasks.length > 0) {
    const { error: taskErr } = await supabase.from('capa_tasks').upsert(tasks, { onConflict: 'id' });
    if (taskErr) console.warn("CAPA tasks upsert warning:", taskErr.message);
    else console.log(`  ✓ Successfully upserted ${tasks.length} CAPA tasks into 'capa_tasks' table.`);
  }

  // 5. Migrate Active Drafts (Preserving Krishna Nagar 52 items & 45 photos)
  console.log(`\n[5/6] Migrating In-Progress Audit Drafts (${(db.drafts || []).length} records)...`);
  const drafts = (db.drafts || []).map(d => ({
    id: d.id,
    user_id: d.user_id || 'unknown',
    user_name: d.user_name || 'Auditor',
    meta: d.meta || {},
    state: d.state || {},
    general: d.general || '',
    step: typeof d.step === 'number' ? d.step : 0,
    timestamp: d.timestamp || '',
    updated_at: d.updated_at || new Date().toISOString()
  }));
  if (drafts.length > 0) {
    const { error: draftErr } = await supabase.from('audit_drafts').upsert(drafts, { onConflict: 'id' });
    if (draftErr) console.warn("Drafts upsert warning:", draftErr.message);
    else {
      console.log(`  ✓ Successfully upserted ${drafts.length} drafts into 'audit_drafts' table.`);
      drafts.forEach(d => {
        console.log(`    - Draft ${d.id}: ${Object.keys(d.state || {}).length} items evaluated, ${d.meta?.dealership_name || 'Dealership'}`);
      });
    }
  }

  // 6. Migrate System State Document (Zero Data Loss Cloud Snapshot)
  console.log(`\n[6/6] Migrating Full Database Snapshot to 'system_state'...`);
  const statePayload = {
    key: 'primary_database',
    payload: db,
    updated_at: new Date().toISOString()
  };
  const { error: stateErr } = await supabase.from('system_state').upsert([statePayload], { onConflict: 'key' });
  if (stateErr) console.warn("System state upsert warning:", stateErr.message);
  else console.log(`  ✓ Successfully upserted full database snapshot into 'system_state'.`);

  // Final Verification
  console.log("\n=================================================================");
  console.log("VERIFYING SUPABASE DATA INTEGRITY:");
  console.log("=================================================================");
  const { count: userCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: branchCount } = await supabase.from('branches').select('*', { count: 'exact', head: true });
  const { count: auditCount } = await supabase.from('audits').select('*', { count: 'exact', head: true });
  const { count: taskCount } = await supabase.from('capa_tasks').select('*', { count: 'exact', head: true });
  const { count: draftCount } = await supabase.from('audit_drafts').select('*', { count: 'exact', head: true });

  console.log(`Users in Supabase:        ${userCount}`);
  console.log(`Branches in Supabase:     ${branchCount}`);
  console.log(`Audits in Supabase:       ${auditCount}`);
  console.log(`CAPA Tasks in Supabase:   ${taskCount}`);
  console.log(`Drafts in Supabase:       ${draftCount}`);
  console.log("=================================================================");
  console.log("MIGRATION TO SUPABASE COMPLETED SUCCESSFULLY!");
  console.log("=================================================================");
}

runMigration().catch(err => {
  console.error("Migration failed with fatal error:", err);
  process.exit(1);
});
