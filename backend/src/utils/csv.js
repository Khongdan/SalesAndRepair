/**
 * Helper xuất CSV đơn giản — đủ dùng cho báo cáo (mục 21: "có thể xuất CSV hoặc Excel").
 * Không dùng thư viện ngoài để giữ dự án gọn nhẹ cho sinh viên.
 */
function toCsv(rows) {
  if (!rows || rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (val) => {
    const s = val === null || val === undefined ? '' : String(val);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) {
    lines.push(headers.map((h) => escape(row[h])).join(','));
  }
  return lines.join('\n');
}

module.exports = { toCsv };
