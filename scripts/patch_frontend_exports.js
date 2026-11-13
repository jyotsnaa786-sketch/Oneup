const fs = require('fs');
const path = require('path');

// 1. Update AuditDetail.jsx
const detailPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AuditDetail.jsx');
let detail = fs.readFileSync(detailPath, 'utf8');

if (!detail.includes('exportUtils')) {
  detail = detail.replace(
    /import { api, getHostBase } from ["']@\/lib\/apiClient["'];/,
    'import { api, getHostBase } from "@/lib/apiClient";\nimport { downloadAuditPdf, downloadAuditExcel } from "@/lib/exportUtils";'
  );
}

detail = detail.replace(
  /const downloadPdf = \(\) => {[\s\S]*?toast\.success\("Downloading OneUP Motors PDF report\.\.\."\);\s*};/,
  'const downloadPdf = () => {\n    downloadAuditPdf(id, audit?.dealership_name, audit?.audit_date);\n  };'
);

detail = detail.replace(
  /const downloadExcel = \(\) => {[\s\S]*?toast\.success\("Downloading Microsoft Excel spreadsheet \(\.xlsx\)\.\.\."\);\s*};/,
  'const downloadExcel = () => {\n    downloadAuditExcel(id, audit?.dealership_name, audit?.audit_date);\n  };'
);

fs.writeFileSync(detailPath, detail, 'utf8');
console.log('✅ AuditDetail.jsx patched');

// 2. Update AuditList.jsx
const listPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AuditList.jsx');
let list = fs.readFileSync(listPath, 'utf8');

if (!list.includes('exportUtils')) {
  list = list.replace(
    /import { api, API } from ["']@\/lib\/apiClient["'];/,
    'import { api, API } from "@/lib/apiClient";\nimport { downloadAuditPdf, downloadAuditExcel } from "@/lib/exportUtils";'
  );
}

// Replace the anchor tags for pdf and excel with interactive buttons
const oldPdfLink = /<a\s+href=\{`\${API}\/audits\/\${a\.id}\/pdf`\}[\s\S]*?<FilePdf size=\{16\} \/>\s*<\/a>/;
const newPdfButton = `<button
                          onClick={() => downloadAuditPdf(a.id, canonicalName || a.dealership_name, a.audit_date)}
                          className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-red-50 hover:text-red-700 hover:border-red-300 transition-colors"
                          title="Download Evidence-Embedded PDF"
                          type="button"
                        >
                          <FilePdf size={16} />
                        </button>`;

const oldExcelLink = /<a\s+href=\{`\${API}\/audits\/\${a\.id}\/excel`\}[\s\S]*?<FileXls size=\{16\} \/>\s*<\/a>/;
const newExcelButton = `<button
                          onClick={() => downloadAuditExcel(a.id, canonicalName || a.dealership_name, a.audit_date)}
                          className="w-8 h-8 border border-border inline-flex items-center justify-center hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 transition-colors"
                          title="Download Inspection Excel Matrix"
                          type="button"
                        >
                          <FileXls size={16} />
                        </button>`;

list = list.replace(oldPdfLink, newPdfButton);
list = list.replace(oldExcelLink, newExcelButton);

fs.writeFileSync(listPath, list, 'utf8');
console.log('✅ AuditList.jsx patched');

// 3. Update AdminPortal.jsx
const adminPath = path.join(__dirname, '..', 'frontend', 'src', 'pages', 'AdminPortal.jsx');
let admin = fs.readFileSync(adminPath, 'utf8');

if (!admin.includes('exportUtils')) {
  admin = admin.replace(
    /import { api, getHostBase } from ["']@\/lib\/apiClient["'];/,
    'import { api, getHostBase } from "@/lib/apiClient";\nimport { downloadAuditPdf, downloadAuditExcel } from "@/lib/exportUtils";'
  );
}

admin = admin.replace(
  /const exportPdf = \(id, name\) => {[\s\S]*?toast\.success\(`Generating branded PDF report for \${name}\.\.\.`\);\s*};/,
  'const exportPdf = (id, name, date) => {\n    downloadAuditPdf(id, name, date);\n  };'
);

admin = admin.replace(
  /const exportExcel = \(id, name\) => {[\s\S]*?toast\.success\(`Generating Excel spreadsheet \(\.xlsx\) for \${name}\.\.\.`\);\s*};/,
  'const exportExcel = (id, name, date) => {\n    downloadAuditExcel(id, name, date);\n  };'
);

admin = admin.replace(
  /onClick=\{[()=> ]*exportPdf\(a\.id,\s*a\.dealership_name\)\}/g,
  'onClick={() => exportPdf(a.id, a.dealership_name, a.audit_date)}'
);

admin = admin.replace(
  /onClick=\{[()=> ]*exportExcel\(a\.id,\s*a\.dealership_name\)\}/g,
  'onClick={() => exportExcel(a.id, a.dealership_name, a.audit_date)}'
);

fs.writeFileSync(adminPath, admin, 'utf8');
console.log('✅ AdminPortal.jsx patched');
