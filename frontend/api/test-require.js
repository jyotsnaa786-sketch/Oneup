const fs = require('fs');
const path = require('path');

export default function handler(req, res) {
  try {
    const backendPath = path.resolve(process.cwd(), '../backend');
    const exists = fs.existsSync(backendPath);
    res.status(200).json({
      cwd: process.cwd(),
      backendPath,
      backendExists: exists,
      filesInCwd: fs.readdirSync(process.cwd())
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
