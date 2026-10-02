/**
 * Service Bảo hành.
 * Gộp 2 nguồn bảo hành đang có sẵn trong hệ thống:
 *  - SalesOrderDetails.WarrantyMonths/WarrantyExpiry — bảo hành theo từng dòng
 *    sản phẩm đã bán (vd: lốp xe, ắc quy...).
 *  - RepairOrders.WarrantyMonths/WarrantyExpiry — bảo hành cho lần sửa chữa
 *    (nhập khi chuyển trạng thái "Đã giao khách").
 *
 * Cung cấp 2 chức năng:
 *  1) search(keyword)  — tra cứu nhanh theo SĐT khách hàng, biển số/số khung
 *     (Devices.IMEI) hoặc mã đơn/phiếu.
 *  2) getExpiring({days}) — danh sách bảo hành sắp hết hạn trong N ngày tới,
 *     dùng cho báo cáo/nhắc khách.
 */
const { sql, getPool } = require('../config/db');

function daysLeft(expiry) {
  if (!expiry) return null;
  const diffMs = new Date(expiry).getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

// Gắn thêm daysLeft + status (ACTIVE / EXPIRING_SOON / EXPIRED) để frontend
// hiển thị badge màu mà không phải tự tính lại ngày giờ.
function withStatus(row) {
  const dl = daysLeft(row.warrantyExpiry);
  let status = 'NONE';
  if (row.warrantyExpiry) {
    if (dl < 0) status = 'EXPIRED';
    else if (dl <= 7) status = 'EXPIRING_SOON';
    else status = 'ACTIVE';
  }
  return { ...row, daysLeft: dl, status };
}

async function search(keyword) {
  const pool = await getPool();
  const kw = `%${keyword.trim()}%`;

  const salesResult = await pool.request().input('kw', sql.NVarChar(200), kw).query(`
    SELECT 'SALE' AS type, so.SalesOrderID AS orderId, so.SalesOrderCode AS orderCode,
           so.OrderDate AS [date], c.FullName AS customerName, c.Phone AS customerPhone,
           p.ProductName AS itemName, sod.WarrantyMonths AS warrantyMonths, sod.WarrantyExpiry AS warrantyExpiry
    FROM SalesOrderDetails sod
    JOIN SalesOrders so ON so.SalesOrderID = sod.SalesOrderID
    JOIN Customers c ON c.CustomerID = so.CustomerID
    JOIN Products p ON p.ProductID = sod.ProductID
    WHERE sod.WarrantyMonths > 0 AND (c.Phone LIKE @kw OR so.SalesOrderCode LIKE @kw)
  `);

  const repairResult = await pool.request().input('kw', sql.NVarChar(200), kw).query(`
    SELECT 'REPAIR' AS type, ro.RepairOrderID AS orderId, ro.RepairOrderCode AS orderCode,
           ro.CompletedDate AS [date], c.FullName AS customerName, c.Phone AS customerPhone,
           (d.DeviceType + N' ' + ISNULL(d.Brand, '') + N' ' + ISNULL(d.Model, '')) AS itemName,
           ro.WarrantyMonths AS warrantyMonths, ro.WarrantyExpiry AS warrantyExpiry
    FROM RepairOrders ro
    JOIN Customers c ON c.CustomerID = ro.CustomerID
    JOIN Devices d ON d.DeviceID = ro.DeviceID
    WHERE ro.WarrantyMonths > 0 AND (c.Phone LIKE @kw OR d.IMEI LIKE @kw OR ro.RepairOrderCode LIKE @kw)
  `);

  const rows = [...salesResult.recordset, ...repairResult.recordset].map(withStatus);
  rows.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  return rows;
}

async function getExpiring({ days = 30 } = {}) {
  const pool = await getPool();

  const salesResult = await pool.request().input('days', sql.Int, days).query(`
    SELECT 'SALE' AS type, so.SalesOrderCode AS orderCode, c.FullName AS customerName, c.Phone AS customerPhone,
           p.ProductName AS itemName, sod.WarrantyExpiry AS warrantyExpiry
    FROM SalesOrderDetails sod
    JOIN SalesOrders so ON so.SalesOrderID = sod.SalesOrderID
    JOIN Customers c ON c.CustomerID = so.CustomerID
    JOIN Products p ON p.ProductID = sod.ProductID
    WHERE sod.WarrantyMonths > 0
      AND sod.WarrantyExpiry BETWEEN SYSDATETIME() AND DATEADD(DAY, @days, SYSDATETIME())
  `);

  const repairResult = await pool.request().input('days', sql.Int, days).query(`
    SELECT 'REPAIR' AS type, ro.RepairOrderCode AS orderCode, c.FullName AS customerName, c.Phone AS customerPhone,
           (d.DeviceType + N' ' + ISNULL(d.Brand, '') + N' ' + ISNULL(d.Model, '')) AS itemName,
           ro.WarrantyExpiry AS warrantyExpiry
    FROM RepairOrders ro
    JOIN Customers c ON c.CustomerID = ro.CustomerID
    JOIN Devices d ON d.DeviceID = ro.DeviceID
    WHERE ro.WarrantyMonths > 0
      AND ro.WarrantyExpiry BETWEEN SYSDATETIME() AND DATEADD(DAY, @days, SYSDATETIME())
  `);

  const rows = [...salesResult.recordset, ...repairResult.recordset].map(withStatus);
  rows.sort((a, b) => new Date(a.warrantyExpiry) - new Date(b.warrantyExpiry));
  return rows;
}

module.exports = { search, getExpiring };
