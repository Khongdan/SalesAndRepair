const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { toCsv } = require('../utils/csv');
const warrantyService = require('../services/warranty.service');

const searchWarranty = asyncHandler(async (req, res) => {
  const { q } = req.query;
  if (!q || !q.trim()) {
    return success(res, [], 'Nhập số điện thoại hoặc biển số/số khung để tra cứu');
  }
  const data = await warrantyService.search(q);
  return success(res, data, 'Tra cứu bảo hành thành công');
});

const getExpiringWarranties = asyncHandler(async (req, res) => {
  const { days, format } = req.query;
  const data = await warrantyService.getExpiring({ days: Number(days) || 30 });

  if (format === 'csv') {
    const csv = toCsv(data);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="bao-hanh-sap-het-han.csv"');
    return res.send('\uFEFF' + csv); // BOM để Excel đọc đúng tiếng Việt
  }

  return success(res, data, 'Lấy danh sách bảo hành sắp hết hạn thành công');
});

module.exports = { searchWarranty, getExpiringWarranties };
