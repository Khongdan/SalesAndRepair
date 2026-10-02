const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const { toCsv } = require('../utils/csv');
const reportService = require('../services/report.service');
const dashboardService = require('../services/dashboard.service');

const getDashboard = asyncHandler(async (req, res) => {
  const summary = await dashboardService.getDashboardSummary();
  return success(res, summary, 'Lấy dữ liệu dashboard thành công');
});

const getRevenueReport = asyncHandler(async (req, res) => {
  const { startDate, endDate, groupBy, format } = req.query;
  const data = await reportService.getRevenueByPeriod({ startDate, endDate, groupBy });

  if (format === 'csv') {
    const csv = toCsv(data.sales);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="doanh-thu-ban-hang.csv"');
    return res.send('\uFEFF' + csv); // BOM để Excel đọc đúng tiếng Việt
  }

  return success(res, data, 'Lấy báo cáo doanh thu thành công');
});

const getProfitReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await reportService.getProfitEstimate({ startDate, endDate });
  return success(res, data, 'Lấy báo cáo lợi nhuận (ước tính) thành công');
});

const getTopProducts = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query;
  const data = await reportService.getTopSellingProducts({ startDate, endDate, limit: Number(limit) || 10 });
  return success(res, data, 'Lấy báo cáo sản phẩm bán chạy thành công');
});

const getTopComponents = asyncHandler(async (req, res) => {
  const { startDate, endDate, limit } = req.query;
  const data = await reportService.getTopUsedComponents({ startDate, endDate, limit: Number(limit) || 10 });
  return success(res, data, 'Lấy báo cáo linh kiện sử dụng nhiều thành công');
});

const getInventoryReport = asyncHandler(async (req, res) => {
  const data = await reportService.getInventoryValuation();
  return success(res, data, 'Lấy báo cáo tồn kho thành công');
});

const getImportExportReport = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await reportService.getImportExportSummary({ startDate, endDate });
  return success(res, data, 'Lấy báo cáo nhập/xuất kho thành công');
});

const getRevenueSummary = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const data = await reportService.getRevenueSummary({ startDate, endDate });
  return success(res, data, 'Lấy tổng hợp doanh thu bán hàng/sửa chữa thành công');
});

const getDebtReport = asyncHandler(async (req, res) => {
  const { format } = req.query;
  const data = await reportService.getOutstandingDebts();

  if (format === 'csv') {
    const csv = toCsv(data.rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="cong-no-khach-hang.csv"');
    return res.send('\uFEFF' + csv);
  }

  return success(res, data, 'Lấy báo cáo công nợ thành công');
});

/**
 * Xuất file Excel (.xlsx) tổng hợp toàn bộ báo cáo trong 1 file nhiều sheet,
 * có style đẹp (mục "xuất báo cáo xlsx dạng đẹp").
 */
const exportReportsXlsx = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  const workbook = await reportService.buildReportsWorkbook({ startDate, endDate });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="bao-cao-tong-hop.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  getDashboard,
  getRevenueReport,
  getProfitReport,
  getTopProducts,
  getTopComponents,
  getInventoryReport,
  getImportExportReport,
  getRevenueSummary,
  getDebtReport,
  exportReportsXlsx,
};
