const XLSX = require('xlsx');
const path = require('path');

try {
    const workbook = XLSX.readFile(path.join(process.cwd(), 'kargo.xlsx'));
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (data.length > 0) {
        console.log("Headers:", JSON.stringify(data[0]));
        console.log("First Row Example:", JSON.stringify(data[1]));
    } else {
        console.log("Empty Excel file");
    }
} catch (e) {
    console.error("Error reading excel:", e.message);
}
