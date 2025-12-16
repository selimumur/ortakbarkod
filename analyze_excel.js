const XLSX = require('xlsx');
const filename = 'c:\\Users\\homem\\Desktop\\ortakbarkod\\tyurunler.xlsx';

try {
    const workbook = XLSX.readFile(filename);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 }); // Get array of arrays

    if (data.length > 0) {
        console.log('Headers:', JSON.stringify(data[0], null, 2));
        if (data.length > 1) {
            console.log('First Row:', JSON.stringify(data[1], null, 2));
        }
    } else {
        console.log('File is empty.');
    }
} catch (error) {
    console.error('Error reading file:', error.message);
}
