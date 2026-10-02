/**
 * Service Báo cáo (mục 21 tài liệu dự án).
 * Mọi báo cáo hỗ trợ lọc theo khoảng ngày qua startDate/endDate (ISO date string).
 * Lợi nhuận bán hàng được tính gần đúng bằng (SalePrice hiện tại của dòng bán - ImportPrice
 * HIỆN TẠI của sản phẩm) — dự án sinh viên không lưu snapshot giá vốn tại thời điểm bán,
 * nên đây là ước tính, không phải giá vốn lịch sử chính xác. Ghi rõ điều này ở README.
 */
const { sql, getPool } = require('../config/db');
const ExcelJS = require('exceljs');
const { addReportSheet } = require('../utils/xlsxBuilder');
const storeSettingsService = require('./storeSettings.service');

function dateRangeClause(request, column, startDate, endDate) {
  let clause = '';
  if (startDate) {
    request.input('startDate', sql.DateTime2, new Date(startDate));
    clause += ` AND ${column} >= @startDate`;
  }
  if (endDate) {
    request.input('endDate', sql.DateTime2, new Date(endDate));
    clause += ` AND ${column} <= @endDate`;
  }
  return clause;
}

// ---------------------------------------------------------------------------
// Doanh thu theo ngày / tháng / năm
// ---------------------------------------------------------------------------

async function getRevenueByPeriod({ startDate, endDate, groupBy = 'day' } = {}) {
  const pool = await getPool();
  const sqlFormat = { day: 'yyyy-MM-dd', month: 'yyyy-MM', year: 'yyyy' }[groupBy] || 'yyyy-MM-dd';

  const salesRequest = pool.request();
  const salesWhere = dateRangeClause(salesRequest, 'OrderDate', startDate, endDate);
  const salesResult = await salesRequest.query(`
    SELECT FORMAT(OrderDate, '${sqlFormat}') AS Period,
           SUM(FinalAmount) AS Revenue, COUNT(*) AS OrderCount
    FROM SalesOrders
    WHERE Status = 'COMPLETED' ${salesWhere}
    GROUP BY FORMAT(OrderDate, '${sqlFormat}')
    ORDER BY Period
  `);

  const repairRequest = pool.request();
  const repairWhere = dateRangeClause(repairRequest, 'p.PaymentDate', startDate, endDate);
  const repairResult = await repairRequest.query(`
    SELECT FORMAT(p.PaymentDate, '${sqlFormat}') AS Period,
           SUM(p.Amount) AS Revenue
    FROM Payments p
    WHERE p.ReferenceType = 'REPAIR_ORDER' ${repairWhere}
    GROUP BY FORMAT(p.PaymentDate, '${sqlFormat}')
    ORDER BY Period
  `);

  return { sales: salesResult.recordset, repairs: repairResult.recordset };
}

// ---------------------------------------------------------------------------
// Lợi nhuận (ước tính)
// ---------------------------------------------------------------------------

async function getProfitEstimate({ startDate, endDate } = {}) {
  const pool = await getPool();
  const request = pool.request();
  const where = dateRangeClause(request, 'so.OrderDate', startDate, endDate);

  const result = await request.query(`
    SELECT
      ISNULL(SUM(sod.Quantity * sod.UnitPrice), 0) AS Revenue,
      ISNULL(SUM(sod.Quantity * p.ImportPrice), 0) AS EstimatedCost
    FROM SalesOrders so
    JOIN SalesOrderDetails sod ON sod.SalesOrderID = so.SalesOrderID
    JOIN Products p ON p.ProductID = sod.ProductID
    WHERE so.Status = 'COMPLETED' ${where}
  `);

  const row = result.recordset[0];
  return {
    revenue: row.Revenue,
    estimatedCost: row.EstimatedCost,
    estimatedProfit: row.Revenue - row.EstimatedCost,
  };
}

// ---------------------------------------------------------------------------
// Sản phẩm bán chạy / Linh kiện sử dụng nhiều
// ---------------------------------------------------------------------------

async function getTopSellingProducts({ startDate, endDate, limit = 10 } = {}) {
  const pool = await getPool();
  const request = pool.request().input('limit', sql.Int, limit);
  const where = dateRangeClause(request, 'so.OrderDate', startDate, endDate);

  const result = await request.query(`
    SELECT TOP (@limit) p.ProductID, p.ProductCode, p.ProductName,
           SUM(sod.Quantity) AS TotalQuantitySold, SUM(sod.LineTotal) AS TotalRevenue
    FROM SalesOrderDetails sod
    JOIN SalesOrders so ON so.SalesOrderID = sod.SalesOrderID
    JOIN Products p ON p.ProductID = sod.ProductID
    WHERE so.Status = 'COMPLETED' ${where}
    GROUP BY p.ProductID, p.ProductCode, p.ProductName
    ORDER BY TotalQuantitySold DESC
  `);
  return result.recordset;
}

async function getTopUsedComponents({ startDate, endDate, limit = 10 } = {}) {
  const pool = await getPool();
  const request = pool.request().input('limit', sql.Int, limit);
  const where = dateRangeClause(request, 'ro.ReceivedDate', startDate, endDate);

  // "c" ở đây là Products (Linh kiện đã gộp vào Sản phẩm) — alias cột
  // ProductCode/ProductName thành ComponentCode/ComponentName để giữ nguyên
  // hình dạng dữ liệu cho sheet Excel/giao diện báo cáo hiện có.
  const result = await request.query(`
    SELECT TOP (@limit) c.ProductID AS ComponentID, c.ProductCode AS ComponentCode, c.ProductName AS ComponentName,
           SUM(rc.Quantity) AS TotalQuantityUsed, SUM(rc.LineTotal) AS TotalRevenue
    FROM RepairComponents rc
    JOIN RepairOrders ro ON ro.RepairOrderID = rc.RepairOrderID
    JOIN Products c ON c.ProductID = rc.ComponentID
    WHERE rc.IsReturned = 0 ${where}
    GROUP BY c.ProductID, c.ProductCode, c.ProductName
    ORDER BY TotalQuantityUsed DESC
  `);
  return result.recordset;
}

// ---------------------------------------------------------------------------
// Tồn kho / Nhập hàng / Xuất hàng
// ---------------------------------------------------------------------------

async function getInventoryValuation() {
  const pool = await getPool();
  const products = await pool.request().query(`
    SELECT ISNULL(SUM(Quantity), 0) AS TotalUnits, ISNULL(SUM(Quantity * ImportPrice), 0) AS TotalValue
    FROM Products WHERE Status = 'ACTIVE'
  `);
  // Lưu ý: trước đây có 2 khối products/components riêng — nay Linh kiện đã
  // gộp vào Products nên chỉ còn 1 khối duy nhất.
  return { products: products.recordset[0] };
}

async function getImportExportSummary({ startDate, endDate } = {}) {
  const pool = await getPool();
  const request = pool.request();
  const where = dateRangeClause(request, 'TransactionDate', startDate, endDate);

  const result = await request.query(`
    SELECT TransactionType, COUNT(*) AS TransactionCount, SUM(Quantity) AS TotalQuantity
    FROM InventoryTransactions
    WHERE 1=1 ${where}
    GROUP BY TransactionType
  `);
  return result.recordset;
}

// ---------------------------------------------------------------------------
// Doanh thu sửa chữa / bán hàng (tổng hợp) + hiệu suất kỹ thuật viên
// ---------------------------------------------------------------------------

async function getRevenueSummary({ startDate, endDate } = {}) {
  const pool = await getPool();

  const salesRequest = pool.request();
  const salesWhere = dateRangeClause(salesRequest, 'OrderDate', startDate, endDate);
  const salesResult = await salesRequest.query(`
    SELECT ISNULL(SUM(FinalAmount), 0) AS TotalSalesRevenue, COUNT(*) AS TotalOrders
    FROM SalesOrders WHERE Status = 'COMPLETED' ${salesWhere}
  `);

  const repairRequest = pool.request();
  const repairWhere = dateRangeClause(repairRequest, 'PaymentDate', startDate, endDate);
  const repairResult = await repairRequest.query(`
    SELECT ISNULL(SUM(Amount), 0) AS TotalRepairRevenue, COUNT(*) AS TotalPayments
    FROM Payments WHERE ReferenceType = 'REPAIR_ORDER' ${repairWhere}
  `);

  return {
    salesRevenue: salesResult.recordset[0].TotalSalesRevenue,
    salesOrderCount: salesResult.recordset[0].TotalOrders,
    repairRevenue: repairResult.recordset[0].TotalRepairRevenue,
    repairPaymentCount: repairResult.recordset[0].TotalPayments,
  };
}

// ---------------------------------------------------------------------------
// Xuất Excel (.xlsx) tổng hợp — mục "xuất báo cáo xlsx dạng đẹp".
// Gộp mọi báo cáo trên trang Báo cáo vào 1 file nhiều sheet, có style
// (tiêu đề cửa hàng, header tô màu, số tiền định dạng phân nghìn...).
// ---------------------------------------------------------------------------

function formatDateRangeLabel(startDate, endDate) {
  const fmt = (d) => new Date(d).toLocaleDateString('vi-VN');
  if (startDate && endDate) return `Từ ${fmt(startDate)} đến ${fmt(endDate)}`;
  if (startDate) return `Từ ${fmt(startDate)}`;
  if (endDate) return `Đến ${fmt(endDate)}`;
  return 'Toàn bộ thời gian';
}

async function buildReportsWorkbook({ startDate, endDate } = {}) {
  const [store, revenue, profit, topProducts, topComponents, inventory, revenueSummary, debt] = await Promise.all([
    storeSettingsService.getStoreSettings().catch(() => null),
    getRevenueByPeriod({ startDate, endDate, groupBy: 'day' }),
    getProfitEstimate({ startDate, endDate }),
    getTopSellingProducts({ startDate, endDate, limit: 20 }),
    getTopUsedComponents({ startDate, endDate, limit: 20 }),
    getInventoryValuation(),
    getRevenueSummary({ startDate, endDate }),
    getOutstandingDebts(),
  ]);

  const workbook = new ExcelJS.Workbook();
  workbook.creator = store?.StoreName || 'Sales & Repair Management';
  workbook.created = new Date();

  const storeName = store?.StoreName || undefined;
  const rangeLabel = formatDateRangeLabel(startDate, endDate);

  // Sheet 1: Tổng quan doanh thu (bán hàng theo ngày)
  addReportSheet(workbook, {
    sheetName: 'Doanh thu theo ngày',
    reportTitle: `Báo cáo doanh thu bán hàng — ${rangeLabel}`,
    storeName,
    rangeLabel: `Tổng doanh thu bán hàng: ${Number(revenueSummary.salesRevenue).toLocaleString('vi-VN')} đ · Tổng doanh thu sửa chữa: ${Number(revenueSummary.repairRevenue).toLocaleString('vi-VN')} đ`,
    columns: [
      { header: 'Ngày', key: 'Period', width: 14 },
      { header: 'Số đơn', key: 'OrderCount', width: 12 },
      { header: 'Doanh thu bán hàng', key: 'Revenue', money: true },
    ],
    rows: revenue.sales,
  });

  // Sheet 2: Doanh thu sửa chữa theo ngày
  addReportSheet(workbook, {
    sheetName: 'Doanh thu sửa chữa',
    reportTitle: `Báo cáo doanh thu sửa chữa — ${rangeLabel}`,
    storeName,
    columns: [
      { header: 'Ngày', key: 'Period', width: 14 },
      { header: 'Doanh thu sửa chữa', key: 'Revenue', money: true },
    ],
    rows: revenue.repairs,
  });

  // Sheet 3: Lợi nhuận ước tính
  addReportSheet(workbook, {
    sheetName: 'Lợi nhuận',
    reportTitle: `Báo cáo lợi nhuận (ước tính) — ${rangeLabel}`,
    storeName,
    rangeLabel: '* Tính theo giá nhập hiện tại của sản phẩm — không phải giá vốn lịch sử chính xác tại thời điểm bán.',
    columns: [
      { header: 'Chỉ số', key: 'label', width: 24 },
      { header: 'Giá trị', key: 'value', money: true },
    ],
    rows: [
      { label: 'Doanh thu', value: profit.revenue },
      { label: 'Giá vốn ước tính', value: profit.estimatedCost },
      { label: 'Lợi nhuận ước tính', value: profit.estimatedProfit },
    ],
  });

  // Sheet 4: Sản phẩm bán chạy
  addReportSheet(workbook, {
    sheetName: 'SP bán chạy',
    reportTitle: `Top sản phẩm bán chạy — ${rangeLabel}`,
    storeName,
    columns: [
      { header: 'Mã SP', key: 'ProductCode', width: 14 },
      { header: 'Tên sản phẩm', key: 'ProductName', width: 28 },
      { header: 'SL bán', key: 'TotalQuantitySold', width: 12 },
      { header: 'Doanh thu', key: 'TotalRevenue', money: true },
    ],
    rows: topProducts,
  });

  // Sheet 5: Linh kiện dùng nhiều
  addReportSheet(workbook, {
    sheetName: 'Linh kiện dùng nhiều',
    reportTitle: `Top linh kiện sử dụng nhiều — ${rangeLabel}`,
    storeName,
    columns: [
      { header: 'Mã LK', key: 'ComponentCode', width: 14 },
      { header: 'Tên linh kiện', key: 'ComponentName', width: 28 },
      { header: 'SL dùng', key: 'TotalQuantityUsed', width: 12 },
      { header: 'Doanh thu', key: 'TotalRevenue', money: true },
    ],
    rows: topComponents,
  });

  // Sheet 6: Tồn kho
  addReportSheet(workbook, {
    sheetName: 'Tồn kho',
    reportTitle: 'Báo cáo tồn kho (tại thời điểm xuất file)',
    storeName,
    columns: [
      { header: 'Loại', key: 'label', width: 20 },
      { header: 'Tổng SL tồn', key: 'units', width: 14 },
      { header: 'Giá trị tồn', key: 'value', money: true },
    ],
    rows: [
      { label: 'Sản phẩm', units: inventory.products.TotalUnits, value: inventory.products.TotalValue },
    ],
  });

  // Sheet 7: Công nợ khách hàng
  addReportSheet(workbook, {
    sheetName: 'Công nợ',
    reportTitle: 'Công nợ khách hàng (tại thời điểm xuất file)',
    storeName,
    rangeLabel: `Tổng công nợ: ${Number(debt.totalDebt).toLocaleString('vi-VN')} đ · Số đơn/phiếu còn nợ: ${debt.count}`,
    columns: [
      { header: 'Loại', key: 'type', width: 12 },
      { header: 'Mã đơn/phiếu', key: 'orderCode', width: 16 },
      { header: 'Khách hàng', key: 'customerName', width: 22 },
      { header: 'SĐT', key: 'customerPhone', width: 14 },
      { header: 'Tổng tiền', key: 'totalAmount', money: true },
      { header: 'Đã trả', key: 'paidAmount', money: true },
      { header: 'Còn nợ', key: 'remainingAmount', money: true },
    ],
    rows: debt.rows.map((r) => ({ ...r, type: r.type === 'SALE' ? 'Bán hàng' : 'Sửa chữa' })),
  });

  return workbook;
}

// ---------------------------------------------------------------------------
// Công nợ khách hàng (bán hàng trả thiếu + sửa chữa chưa thanh toán đủ)
// ---------------------------------------------------------------------------

async function getOutstandingDebts() {
  const pool = await getPool();

  const salesResult = await pool.request().query(`
    SELECT 'SALE' AS type, so.SalesOrderID AS orderId, so.SalesOrderCode AS orderCode, so.OrderDate AS [date],
           ISNULL(c.FullName, N'Khách vãng lai') AS customerName, c.Phone AS customerPhone,
           so.FinalAmount AS totalAmount, p.PaidAmount AS paidAmount, (so.FinalAmount - p.PaidAmount) AS remainingAmount
    FROM SalesOrders so
    LEFT JOIN Customers c ON c.CustomerID = so.CustomerID
    CROSS APPLY (
      SELECT ISNULL(SUM(Amount), 0) AS PaidAmount FROM Payments WHERE ReferenceType = 'SALES_ORDER' AND ReferenceID = so.SalesOrderID
    ) p
    WHERE so.Status <> 'CANCELLED' AND (so.FinalAmount - p.PaidAmount) > 0
  `);

  const repairResult = await pool.request().query(`
    SELECT 'REPAIR' AS type, ro.RepairOrderID AS orderId, ro.RepairOrderCode AS orderCode, ro.ReceivedDate AS [date],
           c.FullName AS customerName, c.Phone AS customerPhone,
           t.TotalCost AS totalAmount, pay.PaidAmount AS paidAmount, (t.TotalCost - pay.PaidAmount) AS remainingAmount
    FROM RepairOrders ro
    JOIN Customers c ON c.CustomerID = ro.CustomerID
    CROSS APPLY (
      SELECT
        ISNULL((SELECT SUM(LineTotal) FROM RepairOrderDetails WHERE RepairOrderID = ro.RepairOrderID), 0)
        + ISNULL((SELECT SUM(LineTotal) FROM RepairComponents WHERE RepairOrderID = ro.RepairOrderID AND IsReturned = 0), 0) AS TotalCost
    ) t
    CROSS APPLY (
      SELECT ISNULL(SUM(Amount), 0) AS PaidAmount FROM Payments WHERE ReferenceType = 'REPAIR_ORDER' AND ReferenceID = ro.RepairOrderID
    ) pay
    WHERE ro.Status NOT IN (N'Hủy', N'Từ chối sửa chữa') AND (t.TotalCost - pay.PaidAmount) > 0
  `);

  const rows = [...salesResult.recordset, ...repairResult.recordset];
  rows.sort((a, b) => Number(b.remainingAmount) - Number(a.remainingAmount));
  const totalDebt = rows.reduce((sum, r) => sum + Number(r.remainingAmount), 0);

  return { rows, totalDebt, count: rows.length };
}

module.exports = {
  getRevenueByPeriod,
  getProfitEstimate,
  getTopSellingProducts,
  getTopUsedComponents,
  getInventoryValuation,
  getImportExportSummary,
  getRevenueSummary,
  getOutstandingDebts,
  buildReportsWorkbook,
};
