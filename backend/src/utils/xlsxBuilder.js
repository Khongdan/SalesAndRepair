/**
 * Helper style hóa file Excel (.xlsx) xuất từ báo cáo — dùng chung cho mọi
 * sheet trong report.service.js. Mục tiêu: file mở ra nhìn "có đầu tư" chứ
 * không phải bảng dữ liệu thô — có tiêu đề cửa hàng, tiêu đề báo cáo, khoảng
 * ngày lọc, dòng header tô màu, số tiền định dạng có phân nghìn, độ rộng cột
 * tự co giãn, cố định dòng header khi cuộn (freeze pane), bật AutoFilter.
 */
const FONT_NAME = 'Times New Roman'; // font duy nhất cho mọi ô trong file Excel

const THEME = {
  brand: 'FF1F4E78',        // xanh đậm cho tiêu đề cửa hàng
  headerFill: 'FF2F6FED',   // nền dòng header
  headerFont: 'FFFFFFFF',   // chữ trắng trên header
  altRowFill: 'FFF3F6FC',   // màu xen dòng chẵn
  border: 'FFD9DEE7',
};

/**
 * Tạo 1 sheet báo cáo hoàn chỉnh: khối tiêu đề (tên cửa hàng + tên báo cáo +
 * khoảng ngày) rồi bảng dữ liệu có style.
 *
 * @param {import('exceljs').Workbook} workbook
 * @param {object} opts
 * @param {string} opts.sheetName - tên tab (tối đa 31 ký tự, Excel giới hạn)
 * @param {string} opts.reportTitle - tên báo cáo, in đậm to bên dưới tên cửa hàng
 * @param {string} [opts.storeName] - tên cửa hàng lấy từ StoreSettings
 * @param {string} [opts.rangeLabel] - dòng mô tả khoảng ngày lọc, ví dụ "Từ 01/09/2026 đến 14/09/2026"
 * @param {Array<{header:string, key:string, width?:number, money?:boolean}>} opts.columns
 * @param {Array<object>} opts.rows
 */
function addReportSheet(workbook, { sheetName, reportTitle, storeName, rangeLabel, columns, rows }) {
  const sheet = workbook.addWorksheet(sheetName.slice(0, 31), {
    views: [{ state: 'frozen', ySplit: 0 }], // cố định phần header sau khi chèn xong (set lại ySplit dưới)
  });

  let currentRow = 1;

  if (storeName) {
    const cell = sheet.getCell(currentRow, 1);
    cell.value = storeName;
    cell.font = { name: FONT_NAME, bold: true, size: 14, color: { argb: THEME.brand } };
    sheet.mergeCells(currentRow, 1, currentRow, Math.max(columns.length, 2));
    currentRow += 1;
  }

  const titleCell = sheet.getCell(currentRow, 1);
  titleCell.value = reportTitle;
  titleCell.font = { name: FONT_NAME, bold: true, size: 12 };
  sheet.mergeCells(currentRow, 1, currentRow, Math.max(columns.length, 2));
  currentRow += 1;

  if (rangeLabel) {
    const rangeCell = sheet.getCell(currentRow, 1);
    rangeCell.value = rangeLabel;
    rangeCell.font = { name: FONT_NAME, italic: true, size: 10, color: { argb: 'FF6B7280' } };
    sheet.mergeCells(currentRow, 1, currentRow, Math.max(columns.length, 2));
    currentRow += 1;
  }

  currentRow += 1; // dòng trống ngăn cách tiêu đề với bảng

  const headerRowNumber = currentRow;
  const headerRow = sheet.getRow(headerRowNumber);
  columns.forEach((col, idx) => {
    const cell = headerRow.getCell(idx + 1);
    cell.value = col.header;
    cell.font = { name: FONT_NAME, bold: true, color: { argb: THEME.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.headerFill } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: THEME.border } },
      bottom: { style: 'thin', color: { argb: THEME.border } },
      left: { style: 'thin', color: { argb: THEME.border } },
      right: { style: 'thin', color: { argb: THEME.border } },
    };
  });
  headerRow.height = 22;

  rows.forEach((rowData, rowIdx) => {
    const rowNumber = headerRowNumber + 1 + rowIdx;
    const row = sheet.getRow(rowNumber);
    columns.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      const value = rowData[col.key];
      cell.value = value === undefined || value === null ? '' : value;
      cell.font = { name: FONT_NAME };
      if (col.money) {
        cell.numFmt = '#,##0 "đ"';
        cell.alignment = { horizontal: 'right' };
      }
      if (rowIdx % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: THEME.altRowFill } };
      }
      cell.border = {
        top: { style: 'thin', color: { argb: THEME.border } },
        bottom: { style: 'thin', color: { argb: THEME.border } },
        left: { style: 'thin', color: { argb: THEME.border } },
        right: { style: 'thin', color: { argb: THEME.border } },
      };
    });
  });

  // Độ rộng cột: lấy max giữa độ dài header và nội dung dài nhất, có chặn trên/dưới.
  columns.forEach((col, idx) => {
    const contentLengths = rows.map((r) => String(r[col.key] ?? '').length);
    const maxLen = Math.max(col.header.length, ...contentLengths, 0);
    sheet.getColumn(idx + 1).width = col.width || Math.min(Math.max(maxLen + 4, 12), 40);
  });

  if (rows.length > 0) {
    sheet.autoFilter = {
      from: { row: headerRowNumber, column: 1 },
      to: { row: headerRowNumber, column: columns.length },
    };
  }
  sheet.views = [{ state: 'frozen', ySplit: headerRowNumber }];

  return sheet;
}

module.exports = { addReportSheet };
