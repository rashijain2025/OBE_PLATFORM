/**
 * Spreadsheet helpers shared by class lists, marks entry and reports.
 * xlsx is loaded on demand so it does not weigh down the initial bundle.
 */

const loadXLSX = () => import('xlsx');

/**
 * Read the first sheet of an .xlsx/.xls/.csv file into an array of row objects keyed by header
 */
export async function readSheetRows(file) {
  const XLSX = await loadXLSX();
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
}

/**
 * Download a workbook built from { name, rows (array of arrays), widths? } sheets
 */
export async function downloadWorkbook(filename, sheets) {
  const XLSX = await loadXLSX();
  const workbook = XLSX.utils.book_new();
  for (const { name, rows, widths } of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    if (widths) sheet['!cols'] = widths.map((wch) => ({ wch }));
    XLSX.utils.book_append_sheet(workbook, sheet, name.slice(0, 31));
  }
  XLSX.writeFile(workbook, filename);
}

/**
 * Find the header in a row object that matches any of the given names (case/space/punctuation-insensitive)
 */
export function findColumn(headers, candidates) {
  const clean = (s) => String(s).toUpperCase().replace(/[^A-Z0-9]/g, '');
  const wanted = candidates.map(clean);
  return headers.find((h) => wanted.includes(clean(h))) || null;
}

/**
 * Save a Blob response (e.g. an API file download) under the given filename
 */
export function saveBlob(blob, filename) {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}
