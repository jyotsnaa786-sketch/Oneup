const xlsx = require('xlsx');
const filePath = "C:\\Users\\jyots_iz\\OneDrive\\Documents\\Physical Audit Chk Sheet.xlsx";

try {
  const workbook = xlsx.readFile(filePath);
  console.log("Sheet Names found:", workbook.SheetNames);

  workbook.SheetNames.forEach(sheetName => {
    console.log(`\n======================================================`);
    console.log(`--- SHEET: ${sheetName} ---`);
    console.log(`======================================================`);
    const worksheet = workbook.Sheets[sheetName];
    const data = xlsx.utils.sheet_to_json(worksheet, { header: 1, defval: "" });
    data.slice(0, 40).forEach((row, i) => {
      if (row.some(cell => String(cell).trim() !== "")) {
        console.log(`Row ${i + 1}:`, row.filter(x => String(x).trim() !== "").join(' | '));
      }
    });
    if (data.length > 40) {
      console.log(`... (${data.length - 40} more rows truncated in printout, total rows: ${data.length})`);
    }
  });
} catch (err) {
  console.error("Error reading excel file:", err.message);
  process.exit(1);
}
