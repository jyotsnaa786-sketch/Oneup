const path = require('path');
const os = require('os');
const fs = require('fs');

// Ensure writable temporary storage directory in Vercel serverless environment
const tmpDir = path.join(os.tmpdir(), 'oneup_data');
const tmpUploads = path.join(tmpDir, 'uploads');
if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
if (!fs.existsSync(tmpUploads)) fs.mkdirSync(tmpUploads, { recursive: true });
process.env.DATA_DIR = tmpDir;

// Seed initial state from bundled files into /tmp if not already initialized
const bundledTemplate = path.join(__dirname, '../backend/data/template_source.json');
const targetTemplate = path.join(tmpDir, 'template_source.json');
if (fs.existsSync(bundledTemplate) && !fs.existsSync(targetTemplate)) {
  try { fs.copyFileSync(bundledTemplate, targetTemplate); } catch (e) {}
}

const bundledDB = path.join(__dirname, '../backend/data/db.json');
const targetDB = path.join(tmpDir, 'db.json');
if (fs.existsSync(bundledDB) && !fs.existsSync(targetDB)) {
  try { fs.copyFileSync(bundledDB, targetDB); } catch (e) {}
}

const app = require('../backend/server.js');

module.exports = app;
