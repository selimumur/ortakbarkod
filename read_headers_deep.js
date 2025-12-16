const XLSX = require('xlsx');
const path = require('path');

try {
    const workbook = XLSX.readFile(path.join(process.cwd(), 'kargo.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    // Read first 10 rows as array of arrays
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: "" });

    console.log("First 10 rows:");
    data.slice(0, 10).forEach((row, i) => {
        console.log(`Row ${i}:`, JSON.stringify(row));
    });

} catch (e) {
    console.error("Error:", e.message);
}
