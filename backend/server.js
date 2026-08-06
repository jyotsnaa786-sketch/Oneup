const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const PDFDocument = require('pdfkit');
const xlsx = require('xlsx');

// Initialize Cloudinary SDK for 25 GB Free Cloud Photo & PDF Storage Vault
let cloudinary = null;
const DEFAULT_CLOUDINARY_URL = process.env.CLOUDINARY_URL || "cloudinary://394641678596358:Y4RIlu1R7DcCjCYwDz2HnBHpfss@iigoe3bx";
if (DEFAULT_CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME) {
  try {
    cloudinary = require('cloudinary').v2;
    if (DEFAULT_CLOUDINARY_URL) {
      cloudinary.config({ url: DEFAULT_CLOUDINARY_URL });
    } else {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
        secure: true
      });
    }
    console.log("☁️ Successfully connected to Cloudinary 25 GB Free Media CDN Vault (iigoe3bx)!");
  } catch (e) {
    console.error("Notice: Cloudinary SDK setup warning:", e.message);
  }
}

const PORT = process.env.PORT || 8001;
const JWT_SECRET = process.env.JWT_SECRET || 'oneup_motors_secret_key_2026';
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const INTERNAL_EXCEL = path.join(DATA_DIR, 'template_source.xlsx');
const LOCAL_EXCEL = "C:\\Users\\jyots_iz\\OneDrive\\Documents\\Physical Audit Chk Sheet.xlsx";
const EXCEL_PATH = fs.existsSync(LOCAL_EXCEL) ? LOCAL_EXCEL : INTERNAL_EXCEL;

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

let db = { users: [], audits: [], files: [], tasks: [], template: [], login_attempts: {} };
if (fs.existsSync(DB_FILE)) {
  try {
    const loaded = JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
    db = { ...db, ...loaded };
  } catch (e) { console.error('Error reading DB, using default schema'); }
}
if (!db.tasks) db.tasks = [];
if (!db.template) db.template = [];
if (!db.audits) db.audits = [];
if (!db.users) db.users = [];

// ============================================================================
// --- FREE CLOUD DATABASE INTEGRATION (MongoDB Atlas / Persistent Storage) ---
// ============================================================================
let mongoClient = null;
let cloudDbCollection = null;
let cloudMediaCollection = null;
let lastCloudError = null;
const MONGODB_URI = process.env.MONGODB_URI || "mongodb+srv://jyotsnaa786_db_user:JLO%40778899@cluster0.mmwbfr7.mongodb.net/oneup_motors_portal?retryWrites=true&w=majority&appName=Cluster0";

async function initCloudDatabase() {
  if (!MONGODB_URI) {
    console.log("ℹ️ MONGODB_URI not set in environment variables. Using standard local file storage.");
    return;
  }
  try {
    const { MongoClient } = require('mongodb');
    mongoClient = new MongoClient(MONGODB_URI);
    await mongoClient.connect();
    const dbInstance = mongoClient.db("oneup_motors_portal");
    cloudDbCollection = dbInstance.collection("persistent_state");
    cloudMediaCollection = dbInstance.collection("media_archives");
    lastCloudError = null;
    console.log("🌟 Successfully connected to MongoDB Atlas Free Cloud Database!");

    // Download latest cloud persistent database state into local memory & disk upon startup
    const cloudRecord = await cloudDbCollection.findOne({ _id: "primary_database" });
    if (cloudRecord && cloudRecord.data) {
      console.log("☁️ Successfully restored permanent database state from MongoDB Cloud!");
      db = { ...db, ...cloudRecord.data };
      if (!db.tasks) db.tasks = [];
      if (!db.template) db.template = [];
      if (!db.audits) db.audits = [];
      if (!db.users) db.users = [];
      try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); } catch(e){}
    } else {
      console.log("☁️ Cloud database archive empty. Initializing cloud record from current DB state...");
      await syncToCloudDatabase();
    }
  } catch (err) {
    lastCloudError = "Boot Error: " + (err.message || String(err));
    console.error("❌ Cloud Database Connection / Restoration Notice:", err.message);
  }
}

async function syncToCloudDatabase() {
  if (!cloudDbCollection) {
    lastCloudError = lastCloudError || "Sync skipped: MongoDB collection not connected.";
    return;
  }
  try {
    await cloudDbCollection.updateOne(
      { _id: "primary_database" },
      { $set: { _id: "primary_database", last_updated: new Date().toISOString(), data: db } },
      { upsert: true }
    );
    lastCloudError = null;
  } catch (err) {
    lastCloudError = "Sync Error: " + (err.message || String(err));
    console.error("Notice: Could not sync DB updates to MongoDB Cloud:", err.message);
  }
}

async function restoreAllCloudMediaToDisk() {
  if (!cloudMediaCollection) return;
  try {
    const count = await cloudMediaCollection.countDocuments();
    console.log(`☁️ Verifying cloud media archives (${count} total files preserved in MongoDB Cloud)...`);
    const cursor = cloudMediaCollection.find({});
    for await (const doc of cursor) {
      if (doc && doc._id && doc.buffer) {
        const filePath = path.join(UPLOADS_DIR, doc._id);
        if (!fs.existsSync(filePath)) {
          try {
            const bufferData = doc.buffer.buffer || doc.buffer;
            fs.writeFileSync(filePath, Buffer.from(bufferData));
            console.log(`📥 Restored cloud media attachment: ${doc._id}`);
          } catch (e) {}
        }
      }
    }
    console.log("✅ All cloud photo & PDF media attachments restored and ready for reports!");
  } catch (err) {
    console.error("Notice during batch cloud media restoration:", err.message);
  }
}

function saveDB() {
  try {
    const tmpFile = `${DB_FILE}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpFile, JSON.stringify(db, null, 2), 'utf8');
    if (fs.existsSync(DB_FILE)) fs.unlinkSync(DB_FILE);
    fs.renameSync(tmpFile, DB_FILE);
  } catch (e) {
    try { fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8'); } catch (err) {}
  }
  // Seamless asynchronous background cloud syncing (Prevents ephemeral data loss across reboots)
  syncToCloudDatabase().catch(() => {});
}

function ensureTemplateLoaded() {
  if (db.template && db.template.length > 0) return;
  console.log("⚠️ Template empty in memory! Auto-recovering from Physical Audit Chk Sheet.xlsx...");
  if (!fs.existsSync(EXCEL_PATH)) {
    console.error("Physical Audit Chk Sheet.xlsx not found at:", EXCEL_PATH);
    return;
  }
  try {
    const workbook = xlsx.readFile(EXCEL_PATH);
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const rows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: "" });

    let categories = [];
    let currentCategory = null;
    let catCounter = 0;

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const section = String(row[1]).trim();
      const whatToCheck = String(row[2]).trim();
      const whereToCheck = String(row[3]).trim();
      if (!section && !whatToCheck) continue;

      if (section) {
        catCounter++;
        const catId = `cat_${catCounter}_${section.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').substring(0, 15)}`;
        currentCategory = { category_id: catId, name: section, items: [] };
        categories.push(currentCategory);
      }
      if (whatToCheck && currentCategory) {
        const itemId = `${currentCategory.category_id}_${currentCategory.items.length + 1}`;
        let fullText = whatToCheck;
        if (whereToCheck && whereToCheck.toLowerCase() !== "n/a" && whereToCheck.toLowerCase() !== "na") {
          fullText += ` [Reference / Source: ${whereToCheck}]`;
        }
        currentCategory.items.push({ item_id: itemId, text: fullText });
      }
    }
    if (categories.length > 0) {
      db.template = categories;
      saveDB();
      console.log(`✅ Successfully auto-healed database with ${categories.length} categories from Excel sheet!`);
    }
  } catch (e) { console.error("Error auto-healing template:", e); }
}
ensureTemplateLoaded();

// Seed & Synchronize Admin Account
const ADMIN_EMAIL = 'jyotsnaa786@gmail.com';
const ADMIN_PASS = 'girdhar123';
let existingAdmin = db.users.find(u => u.email === ADMIN_EMAIL);
if (!existingAdmin) {
  const hash = bcrypt.hashSync(ADMIN_PASS, 10);
  db.users.push({
    id: '6a6c8ca3c8557f58c23d3a27',
    email: ADMIN_EMAIL,
    name: 'OneUP Admin Manager',
    role: 'admin',
    password_hash: hash,
    created_at: new Date().toISOString()
  });
  saveDB();
} else {
  existingAdmin.password_hash = bcrypt.hashSync(ADMIN_PASS, 10);
  saveDB();
}

// Seed Director View-Only Account
const DIRECTOR_EMAIL = 'directors@oneupmaruti.com';
const DIRECTOR_PASS = 'director123';
if (!db.users.find(u => u.email === DIRECTOR_EMAIL)) {
  const hash = bcrypt.hashSync(DIRECTOR_PASS, 10);
  db.users.push({
    id: '7b7d9db4d9668f69d34e4b38',
    email: DIRECTOR_EMAIL,
    name: 'OneUP Board of Directors',
    role: 'director',
    password_hash: hash,
    created_at: new Date().toISOString()
  });
  saveDB();
}

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = file.originalname.split('.').pop() || 'png';
    cb(null, `${crypto.randomUUID()}.${ext}`);
  }
});
const upload = multer({ storage, limits: { fileSize: 50 * 1024 * 1024 } });

function computeScores(categories) {
  let catScores = [];
  let totalPass = 0;
  let totalApplicable = 0;
  for (const cat of (categories || [])) {
    let cPass = 0;
    let cApplicable = 0;
    for (const item of (cat.items || [])) {
      if (item.result === "pass") { cPass++; cApplicable++; }
      else if (item.result === "fail") { cApplicable++; }
    }
    const pct = cApplicable ? Math.round((cPass / cApplicable) * 1000) / 10 : 0.0;
    catScores.push({
      category_id: cat.category_id,
      name: cat.name,
      score: pct,
      passed: cPass,
      applicable: cApplicable,
      total: (cat.items || []).length
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

function authMiddleware(req, res, next) {
  let token = req.cookies.access_token;
  if (!token && req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.substring(7);
  }
  if (!token && req.query.auth) {
    token = req.query.auth;
  }
  if (!token) return res.status(401).json({ detail: "Not authenticated" });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = db.users.find(u => u.id === decoded.sub);
    if (!user) return res.status(401).json({ detail: "User not found" });
    const { password_hash, ...userData } = user;
    req.user = userData;
    next();
  } catch (e) {
    return res.status(401).json({ detail: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ detail: "Access Denied: Restricted to OneUP Motors Administrators only." });
  }
  next();
}

function adminOrDirector(req, res, next) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'director')) {
    return res.status(403).json({ detail: "Access Denied: Restricted to OneUP Administrators and Directors." });
  }
  next();
}

function preventDirectorEdits(req, res, next) {
  if (req.user && req.user.role === 'director') {
    return res.status(403).json({ detail: "Access Denied: Board of Directors accounts operate in strict view-only executive governance mode." });
  }
  next();
}

// --- Windows Desktop App Setup Installer Download Endpoint ---
app.get('/api/download/windows-app', (req, res) => {
  const scriptContent = `@echo off
echo ==========================================================
echo INSTALLING ONEUP MOTORS AFTER-SALES AUDIT APP TO DESKTOP
echo ==========================================================
powershell -Command "$WshShell = New-Object -ComObject WScript.Shell; $Shortcut = $WshShell.CreateShortcut('$HOME\\Desktop\\OneUP Motors Audit App.lnk'); $Shortcut.TargetPath = 'msedge.exe'; $Shortcut.Arguments = '--app=https://oneup-motors-audit.onrender.com'; $Shortcut.Description = 'OneUP Motors After-Sales Audit System'; $Shortcut.Save()"
if %ERRORLEVEL% EQU 0 (
  echo.
  echo [SUCCESS] OneUP Motors App shortcut installed onto your PC Desktop!
  echo You can now double-click the icon on your desktop anytime!
  echo.
  start "" "%HOME%\\Desktop\\OneUP Motors Audit App.lnk"
) else (
  echo [ERROR] Could not create desktop shortcut.
)
pause
`;
  res.setHeader('Content-Disposition', 'attachment; filename="Install_OneUP_Audit_App.bat"');
  res.setHeader('Content-Type', 'application/x-bat');
  res.send(scriptContent);
});

// --- Auth Routes ---
app.post('/api/auth/register', (req, res) => {
  const { email, password, name } = req.body;
  if (!email || !password || !name) return res.status(400).json({ detail: "All fields are required" });
  const cleanEmail = email.toLowerCase();
  if (db.users.find(u => u.email === cleanEmail)) {
    return res.status(400).json({ detail: "Email already registered" });
  }
  const newUser = {
    id: crypto.randomUUID(),
    email: cleanEmail,
    name: name,
    role: "auditor",
    password_hash: bcrypt.hashSync(password, 10),
    created_at: new Date().toISOString()
  };
  db.users.push(newUser);
  saveDB();
  const token = jwt.sign({ sub: newUser.id, email: newUser.email, type: "access" }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('access_token', token, { httpOnly: true, path: '/', maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ id: newUser.id, email: newUser.email, name: newUser.name, role: newUser.role, access_token: token });
});

app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ detail: "Email and password required" });
  const cleanEmail = email.toLowerCase();
  const ip = req.ip || 'unknown';
  const identifier = `${ip}:${cleanEmail}`;

  const attempt = db.login_attempts[identifier] || { count: 0 };
  if (attempt.count >= 5 && attempt.locked_until && new Date(attempt.locked_until) > new Date()) {
    return res.status(429).json({ detail: "Too many attempts. Try again in 15 minutes." });
  }

  const user = db.users.find(u => u.email === cleanEmail);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    db.login_attempts[identifier] = {
      count: attempt.count + 1,
      locked_until: new Date(Date.now() + 15 * 60000).toISOString()
    };
    saveDB();
    return res.status(401).json({ detail: "Invalid email or password" });
  }
  delete db.login_attempts[identifier];
  saveDB();
  const token = jwt.sign({ sub: user.id, email: user.email, type: "access" }, JWT_SECRET, { expiresIn: '7d' });
  res.cookie('access_token', token, { httpOnly: true, path: '/', maxAge: 7 * 24 * 3600 * 1000 });
  res.json({ id: user.id, email: user.email, name: user.name, role: user.role, access_token: token });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('access_token', { path: '/' });
  res.clearCookie('refresh_token', { path: '/' });
  res.json({ message: "Logged out" });
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// --- Public Health & Keep-Alive Endpoint ---
app.get('/api/ping', (req, res) => {
  res.status(200).json({ status: "alive", timestamp: new Date().toISOString(), uptime: Math.round(process.uptime()) });
});

// --- Dynamic Template Routes ---
app.get('/api/audit-template', authMiddleware, (req, res) => {
  ensureTemplateLoaded();
  res.json(db.template || []);
});

app.put('/api/audit-template', authMiddleware, adminOnly, (req, res) => {
  if (!Array.isArray(req.body) || req.body.length === 0) {
    return res.status(400).json({ detail: "Invalid template format" });
  }
  db.template = req.body;
  saveDB();
  res.json({ message: "Template updated successfully", template: db.template });
});

// --- Core Audit Routes ---
app.post('/api/audits', authMiddleware, preventDirectorEdits, (req, res) => {
  try {
    const { dealership_name, location, auditor_name, audit_date, categories, general_notes } = req.body;
    const { overall, catScores } = computeScores(categories || []);
    const auditId = crypto.randomUUID();
    const doc = {
      id: auditId,
      dealership_name: dealership_name || "OneUP Motors",
      location: location || "",
      auditor_name: auditor_name || "Inspector",
      audit_date: audit_date || new Date().toISOString().slice(0, 10),
      categories: Array.isArray(categories) ? categories : [],
      general_notes: general_notes || "",
      overall_score: overall,
      category_scores: catScores,
      status: statusFromScore(overall),
      created_by: req.user ? req.user.id : "unknown",
      created_at: new Date().toISOString()
    };
    if (!Array.isArray(db.audits)) db.audits = [];
    if (!Array.isArray(db.tasks)) db.tasks = [];
    db.audits.unshift(doc);

    if (Array.isArray(categories)) {
      categories.forEach(cat => {
        if (cat && Array.isArray(cat.items)) {
          cat.items.forEach(it => {
            if (it && it.result === "fail") {
              const due = new Date();
              due.setDate(due.getDate() + 7);
              db.tasks.unshift({
                id: crypto.randomUUID(),
                audit_id: auditId,
                dealership_name: dealership_name || "OneUP Motors",
                category_name: cat.name || "",
                item_id: it.item_id || "",
                item_text: it.text || "",
                note: it.note || "",
                owner: "OneUP Service Manager",
                due_date: due.toISOString().slice(0, 10),
                status: "open",
                created_at: new Date().toISOString()
              });
            }
          });
        }
      });
    }

    saveDB();
    res.json(doc);
  } catch (err) {
    console.error("Critical Exception in POST /api/audits:", err);
    res.status(500).json({ detail: "Audit Submission Error: " + (err.message || String(err)), stack: err.stack });
  }
});

app.get('/api/audits', authMiddleware, (req, res) => {
  res.json(db.audits || []);
});

app.get('/api/audits/:id', authMiddleware, (req, res) => {
  const audit = db.audits.find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ detail: "Audit not found" });
  res.json(audit);
});

app.delete('/api/audits/:id', authMiddleware, adminOnly, (req, res) => {
  const idx = db.audits.findIndex(a => a.id === req.params.id);
  if (idx === -1) return res.status(404).json({ detail: "Audit not found" });
  db.audits.splice(idx, 1);
  db.tasks = (db.tasks || []).filter(t => t.audit_id !== req.params.id);
  saveDB();
  res.json({ message: "deleted" });
});

// --- Action Tracker Routes ---
app.get('/api/tasks', authMiddleware, (req, res) => {
  res.json(db.tasks || []);
});

app.patch('/api/tasks/:id', authMiddleware, preventDirectorEdits, (req, res) => {
  const task = (db.tasks || []).find(t => t.id === req.params.id);
  if (!task) return res.status(404).json({ detail: "Task not found" });
  const { owner, due_date, status, action_remark, follow_up_date } = req.body;

  // Enforce mandatory Action Taken Remarks when attempting to close a task
  if (status === 'closed') {
    const effectiveRemark = (action_remark !== undefined ? action_remark : (task.action_remark || "")).trim();
    if (effectiveRemark.length < 3) {
      return res.status(400).json({ detail: "Mandatory Governance Rule: Action Taken Remarks must be recorded before a defect task can be marked as closed!" });
    }
  }

  if (owner !== undefined) task.owner = owner;
  if (due_date !== undefined) task.due_date = due_date;
  if (action_remark !== undefined) task.action_remark = action_remark.trim();
  if (follow_up_date !== undefined) task.follow_up_date = follow_up_date;
  if (status !== undefined) task.status = status;
  saveDB();
  res.json(task);
});

// --- UNIVERSAL EXPORT ENGINES (PDF & EXCEL FOR ALL LOGGED IN EMPLOYEES & DIRECTORS) ---
app.get('/api/audits/:id/pdf', authMiddleware, async (req, res) => {
  const audit = (db.audits || []).find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ detail: "Audit not found" });

  // Pre-fetch external cloud images (Cloudinary CDN) into memory buffers so pdfkit physically embeds actual photos!
  const imageBuffers = {};
  for (const cat of (audit.categories || [])) {
    for (const item of (cat.items || [])) {
      if (item.evidence && item.evidence.length > 0) {
        for (const evPath of item.evidence) {
          if ((evPath.startsWith("http://") || evPath.startsWith("https://")) && !evPath.toLowerCase().endsWith(".pdf")) {
            try {
              const fetchRes = await fetch(evPath);
              if (fetchRes.ok) {
                const arrayBuffer = await fetchRes.arrayBuffer();
                imageBuffers[evPath] = Buffer.from(arrayBuffer);
                console.log(`📸 Pre-fetched cloud image for PDF embedding: ${evPath}`);
              }
            } catch (e) {
              console.error("Notice: Could not fetch cloud photo for PDF:", evPath, e.message);
            }
          }
        }
      }
    }
  }

  const doc = new PDFDocument({ margin: 40, size: 'A4', bufferPages: true });
  const filename = `OneUP_Motors_Audit_${audit.dealership_name.replace(/\s+/g, '_')}_${audit.audit_date}.pdf`;
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/pdf');
  doc.pipe(res);

  // Header Banner
  doc.rect(40, 40, 515, 75).fill('#0047AB');
  doc.fillColor('#FFFFFF').font('Helvetica-Bold').fontSize(20).text('ONEUP MOTORS AFTER-SALES AUDIT', 55, 55);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#FFCE00').text('OFFICIAL COMPLIANCE PROTOCOL REPORT & RECORD', 55, 82);
  doc.font('Helvetica').fontSize(9).fillColor('#FFFFFF').text(`Report Generated On: ${new Date().toLocaleString()}`, 55, 96);

  doc.fillColor('#0A0A0A').font('Helvetica-Bold').fontSize(16).text(audit.dealership_name, 40, 132);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#4B5563').text(`Branch Location: ${audit.location}   |   Field Inspector: ${audit.auditor_name}   |   Inspection Date: ${audit.audit_date}`, 40, 153);

  let statusColor = '#0047AB';
  if (audit.status === 'Compliant') statusColor = '#059669';
  else if (audit.status === 'Needs Attention') statusColor = '#EA580C';
  else statusColor = '#DC2626';

  doc.rect(40, 180, 515, 56).fill('#F3F4F6');
  doc.fillColor('#0A0A0A').font('Helvetica-Bold').fontSize(13).text(`OVERALL COMPLIANCE SCORE:  ${audit.overall_score}%`, 55, 193, { width: 480 });
  doc.fillColor(statusColor).font('Helvetica-Bold').fontSize(13).text(`AUDIT COMPLIANCE STATUS:    ${audit.status.toUpperCase()}`, 55, 214, { width: 480 });

  let y = 255;
  doc.fillColor('#0047AB').font('Helvetica-Bold').fontSize(12).text('CATEGORY PERFORMANCE BREAKDOWN (20 PILLARS)', 40, y);
  y += 20;

  (audit.category_scores || []).forEach(cs => {
    const catText = `${cs.name}:`;
    const scoreText = `${cs.score}% (${cs.passed}/${cs.applicable} Passed)`;
    const textHeight = doc.font('Helvetica-Bold').fontSize(10).heightOfString(catText, { width: 280 });
    const rowHeight = Math.max(18, textHeight + 6);

    if (y + rowHeight > 750) { doc.addPage(); y = 50; }

    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0A0A0A').text(catText, 45, y, { width: 280 });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(cs.score >= 90 ? '#059669' : '#DC2626').text(scoreText, 340, y);
    y += rowHeight;
  });

  y += 15;
  if (y > 720) { doc.addPage(); y = 50; }
  doc.rect(40, y, 515, 2).fill('#E5E7EB');
  y += 15;
  doc.fillColor('#0047AB').font('Helvetica-Bold').fontSize(13).text('ITEMIZED INSPECTION LOG & PHOTOGRAPHIC EVIDENCE', 40, y);
  y += 22;

  (audit.categories || []).forEach(cat => {
    if (y + 40 > 750) { doc.addPage(); y = 50; }
    
    doc.rect(40, y, 515, 22).fill('#EAECEF');
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#0047AB').text(`PILLAR: ${cat.name.toUpperCase()}`, 48, y + 6, { width: 490 });
    y += 30;

    (cat.items || []).forEach(item => {
      const resText = item.result ? item.result.toUpperCase() : 'N/A';
      let resColor = resText === 'PASS' ? '#059669' : resText === 'FAIL' ? '#DC2626' : '#6B7280';
      
      const textWidth = 430;
      const textHeight = doc.font('Helvetica').fontSize(9).heightOfString(item.text, { width: textWidth });
      const noteHeight = item.note ? doc.font('Helvetica-Oblique').fontSize(9).heightOfString(`Audited Finding: "${item.note}"`, { width: textWidth }) + 6 : 0;
      
      // Calculate image thumbnail & PDF doc requirement if evidence files attached
      let imgHeight = 0;
      let validImgPath = null;
      let hasPdfAttachment = false;

      if (item.evidence && item.evidence.length > 0) {
        for (const evPath of item.evidence) {
          if (evPath.startsWith("http://") || evPath.startsWith("https://")) {
            if (evPath.toLowerCase().endsWith(".pdf")) {
              hasPdfAttachment = true;
            } else if (!validImgPath && imageBuffers[evPath]) {
              validImgPath = imageBuffers[evPath];
              imgHeight = 130; // thumbnail height footprint for cloud photo buffer
            }
          } else {
            const checkPath = path.join(DATA_DIR, evPath);
            if (fs.existsSync(checkPath)) {
              if (checkPath.toLowerCase().endsWith('.pdf')) {
                hasPdfAttachment = true;
              } else if (!validImgPath && /\.(jpg|jpeg|png|webp|bmp)$/i.test(checkPath)) {
                validImgPath = checkPath;
                imgHeight = 130; // thumbnail height footprint for local file
              }
            }
          }
        }
      }

      const pdfBadgeHeight = hasPdfAttachment ? 18 : 0;
      const totalRowFootprint = textHeight + noteHeight + imgHeight + pdfBadgeHeight + 14;

      if (y + totalRowFootprint > 750) {
        doc.addPage();
        y = 50;
      }

      // Print status badge and checklist instruction
      doc.font('Helvetica-Bold').fontSize(9).fillColor(resColor).text(`[${resText}]`, 45, y);
      doc.font('Helvetica').fontSize(9).fillColor('#0A0A0A').text(item.text, 88, y, { width: textWidth });
      y += textHeight + 4;

      // Print auditor notes without overlapping
      if (item.note) {
        doc.font('Helvetica-Oblique').fontSize(9).fillColor('#374151').text(`Audited Finding: "${item.note}"`, 88, y, { width: textWidth });
        y += noteHeight;
      }

      // Print confirmation banner if supporting PDF documents are attached to this item
      if (hasPdfAttachment) {
        doc.font('Helvetica-Bold').fontSize(8.5).fillColor('#0047AB').text('📄 Supporting Evidence: Verified PDF Document Attached in OneUP Archives', 88, y + 2, { width: textWidth });
        y += 18;
      }

      // Physically render actual defect inspection photograph inside PDF!
      if (validImgPath) {
        try {
          doc.image(validImgPath, 88, y + 2, { width: 160, height: 115, fit: [160, 115], align: 'left' });
          doc.font('Helvetica-Bold').fontSize(8).fillColor('#059669').text('✓ Verified Photographic Defect Evidence', 255, y + 15);
          y += 125;
        } catch (err) {
          console.error("Could not render photo to PDF:", err);
        }
      }

      y += 8; // generous bottom buffer before next item
    });

    y += 10;
  });

  if (audit.general_notes) {
    const notesHeight = doc.font('Helvetica').fontSize(10).heightOfString(audit.general_notes, { width: 515 });
    if (y + notesHeight + 40 > 750) { doc.addPage(); y = 50; }
    doc.rect(40, y, 515, 20).fill('#F3F4F6');
    doc.font('Helvetica-Bold').fontSize(11).fillColor('#0A0A0A').text('GENERAL SUMMARY & STRATEGIC OBSERVATIONS', 48, y + 5);
    y += 26;
    doc.font('Helvetica').fontSize(10).fillColor('#0A0A0A').text(audit.general_notes, 40, y, { width: 515 });
  }

  doc.end();
});

app.get('/api/audits/:id/excel', authMiddleware, (req, res) => {
  const audit = (db.audits || []).find(a => a.id === req.params.id);
  if (!audit) return res.status(404).json({ detail: "Audit not found" });

  const rows = [];
  rows.push(["ONEUP MOTORS AFTER-SALES AUDIT - OFFICIAL INSPECTION SPREADSHEET"]);
  rows.push([`Dealership: ${audit.dealership_name}`, `Location: ${audit.location}`, `Auditing Date: ${audit.audit_date}`, `Overall Score: ${audit.overall_score}% (${audit.status})`]);
  rows.push([]);
  rows.push(["Sr. No.", "Audit Section / Category", "Item ID", "What to Check & Reference Source", "Compliance (PASS / FAIL / NA)", "Auditor Findings / Note"]);

  let serial = 1;
  (audit.categories || []).forEach(cat => {
    (cat.items || []).forEach(item => {
      rows.push([
        serial++,
        cat.name,
        item.item_id,
        item.text,
        item.result ? item.result.toUpperCase() : "NA",
        item.note || ""
      ]);
    });
  });

  const worksheet = xlsx.utils.aoa_to_sheet(rows);
  worksheet['!cols'] = [{ wch: 8 }, { wch: 28 }, { wch: 15 }, { wch: 65 }, { wch: 25 }, { wch: 45 }];

  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, "OneUP Audit Record");

  const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });
  const filename = `OneUP_Motors_Audit_${audit.dealership_name.replace(/\s+/g, '_')}_${audit.audit_date}.xlsx`;

  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.send(buffer);
});

app.get('/api/dashboard/stats', authMiddleware, (req, res) => {
  const audits = db.audits || [];
  const total = audits.length;
  const open_tasks = (db.tasks || []).filter(t => t.status === 'open').length;
  if (total === 0) {
    return res.json({
      total_audits: 0, avg_score: 0, compliant: 0, needs_attention: 0,
      non_compliant: 0, open_tasks: 0, category_averages: [], trend: [], recent: []
    });
  }
  const avg_score = Math.round((audits.reduce((acc, a) => acc + a.overall_score, 0) / total) * 10) / 10;
  const compliant = audits.filter(a => a.status === "Compliant").length;
  const needs_attention = audits.filter(a => a.status === "Needs Attention").length;
  const non_compliant = audits.filter(a => a.status === "Non-Compliant").length;
  
  const catTotals = {};
  audits.forEach(a => {
    (a.category_scores || []).forEach(cs => {
      if (!catTotals[cs.name]) catTotals[cs.name] = [];
      catTotals[cs.name].push(cs.score);
    });
  });
  const category_averages = Object.keys(catTotals).map(name => ({
    name: name.split(' ')[0].substring(0, 12),
    score: Math.round((catTotals[name].reduce((acc, v) => acc + v, 0) / catTotals[name].length) * 10) / 10
  }));

  const trend = audits.slice().sort((a,b) => new Date(a.created_at) - new Date(b.created_at)).slice(-10).map(a => ({
    date: a.audit_date,
    score: a.overall_score,
    dealership: a.dealership_name
  }));

  res.json({
    total_audits: total,
    avg_score,
    compliant,
    needs_attention,
    non_compliant,
    open_tasks,
    category_averages,
    trend,
    recent: audits.slice(0, 5)
  });
});

app.post('/api/upload', authMiddleware, upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ detail: "No file provided" });
  const fileId = crypto.randomUUID();
  let relativePath = `uploads/${req.file.filename}`;
  let cloudinaryUrl = null;

  // 1) Attempt seamless enterprise upload to Cloudinary 25 GB Free CDN Vault
  if (cloudinary && req.file.path && fs.existsSync(req.file.path)) {
    try {
      const cRes = await cloudinary.uploader.upload(req.file.path, {
        folder: "oneup_audit_archives",
        resource_type: "auto",
        use_filename: true,
        unique_filename: true
      });
      cloudinaryUrl = cRes.secure_url || cRes.url;
      console.log("☁️ File archived securely to Cloudinary CDN Vault:", cloudinaryUrl);
    } catch (err) {
      console.error("Notice during Cloudinary CDN archival:", err.message);
    }
  }

  // 2) If Cloudinary isn't enabled yet, backup to MongoDB Cloud media collection as fallback!
  if (!cloudinaryUrl && cloudMediaCollection && req.file.path && fs.existsSync(req.file.path)) {
    try {
      const fileBuffer = fs.readFileSync(req.file.path);
      cloudMediaCollection.updateOne(
        { _id: req.file.filename },
        { $set: { _id: req.file.filename, buffer: fileBuffer, mimetype: req.file.mimetype, created_at: new Date().toISOString() } },
        { upsert: true }
      ).catch(e => console.error("Could not upload file to MongoDB Cloud:", e.message));
    } catch (e) {}
  }

  const finalStoragePath = cloudinaryUrl || relativePath;
  db.files.push({
    id: fileId,
    storage_path: finalStoragePath,
    cloudinary_url: cloudinaryUrl,
    original_filename: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    uploaded_by: req.user.id,
    created_at: new Date().toISOString()
  });
  saveDB();

  res.json({ path: finalStoragePath });
});

app.get('/api/files/uploads/:filename', async (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(UPLOADS_DIR, filename);
  if (!fs.existsSync(filePath)) {
    // Attempt automatic on-demand cloud restoration from MongoDB media archive
    if (cloudMediaCollection) {
      try {
        const cloudMedia = await cloudMediaCollection.findOne({ _id: filename });
        if (cloudMedia && cloudMedia.buffer) {
          const bufferData = cloudMedia.buffer.buffer || cloudMedia.buffer;
          fs.writeFileSync(filePath, Buffer.from(bufferData));
          console.log(`☁️ On-demand cloud restore successful for file: ${filename}`);
          return res.sendFile(filePath);
        }
      } catch (err) {
        console.error(`Failed on-demand cloud restore for ${filename}:`, err.message);
      }
    }
    return res.status(404).json({ detail: "File not found in archives" });
  }
  res.sendFile(filePath);
});

// --- CLOUD DIAGNOSTIC & MONITORING ENDPOINT ---
app.get('/api/system/cloud-status', (req, res) => {
  res.json({
    mongodb_connected: Boolean(cloudDbCollection),
    last_cloud_error: lastCloudError || "None (Operating Cleanly)",
    total_audits_in_memory: db.audits ? db.audits.length : 0,
    cloudinary_initialized: Boolean(cloudinary)
  });
});

app.post('/api/system/reboot-cloud', async (req, res) => {
  console.log("⚡ Manual cloud reconnection triggered over API!");
  await initCloudDatabase();
  await restoreAllCloudMediaToDisk();
  res.json({
    message: "Reboot sequence executed",
    mongodb_connected: Boolean(cloudDbCollection),
    last_cloud_error: lastCloudError || "None (Operating Cleanly)"
  });
});

// --- SERVE COMPILED FRONTEND WITH ZERO-CACHE HEADERS ---
const DIST_DIR = path.join(__dirname, '../frontend/dist');
if (fs.existsSync(DIST_DIR)) {
  app.use(express.static(DIST_DIR, {
    setHeaders: (res, filePath) => {
      if (filePath.endsWith('.html') || filePath.endsWith('.json')) {
        res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      }
    }
  }));
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.sendFile(path.join(DIST_DIR, 'index.html'));
    }
  });
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`OneUP Motors Bulletproof Server v5.0 running on http://0.0.0.0:${PORT}`);
  
  // Connect to MongoDB Atlas Cloud Persistence & restore audits/photos immediately upon server boot
  initCloudDatabase()
    .then(() => restoreAllCloudMediaToDisk())
    .catch(e => console.error("Cloud boot notice:", e.message));
  
  // Automated Self-Ping Heartbeat Loop (Sends keep-alive signals every 4 minutes to thwart inactivity timeouts)
  setInterval(() => {
    try {
      const externalTarget = process.env.RENDER_EXTERNAL_URL ? `${process.env.RENDER_EXTERNAL_URL}/api/ping` : "https://oneup-motors-audit.onrender.com/api/ping";
      fetch(externalTarget).catch(() => {});
      fetch(`http://127.0.0.1:${PORT}/api/ping`).catch(() => {});
    } catch (e) {}
  }, 240000);
});
