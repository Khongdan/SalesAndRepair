/**
 * Service Customers. Mọi query dùng parameterized input để chống SQL Injection.
 * getHistory() tổng hợp lịch sử mua hàng + lịch sử sửa chữa + tổng chi tiêu
 * + các thiết bị từng sửa chữa (đúng mục 10 tài liệu dự án).
 */
const { sql, getPool } = require('../config/db');

function generateCustomerCode() {
  const rand = Math.floor(Math.random() * 900 + 100);
  return `CUS${Date.now()}${rand}`.slice(0, 20);
}

async function listCustomers({ page = 1, pageSize = 20, search = '' } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const result = await pool
    .request()
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .input('search', sql.NVarChar(150), `%${search}%`)
    .query(`
      SELECT CustomerID, CustomerCode, FullName, Phone, Email, Address, Note, CreatedAt
      FROM Customers
      WHERE FullName LIKE @search OR Phone LIKE @search OR CustomerCode LIKE @search
      ORDER BY CustomerID DESC
      OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
    `);

  const countResult = await pool
    .request()
    .input('search', sql.NVarChar(150), `%${search}%`)
    .query('SELECT COUNT(*) AS total FROM Customers WHERE FullName LIKE @search OR Phone LIKE @search OR CustomerCode LIKE @search');

  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

async function listAll() {
  const pool = await getPool();
  const result = await pool.request().query(
    'SELECT CustomerID, CustomerCode, FullName, Phone FROM Customers ORDER BY FullName'
  );
  return result.recordset;
}

async function findById(customerId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT CustomerID, CustomerCode, FullName, Phone, Email, Address, Note, CreatedAt
      FROM Customers WHERE CustomerID = @customerId
    `);
  return result.recordset[0] || null;
}

async function findByPhone(phone) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('phone', sql.NVarChar(20), phone)
    .query('SELECT CustomerID FROM Customers WHERE Phone = @phone');
  return result.recordset[0] || null;
}

async function createCustomer(c) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('customerCode', sql.NVarChar(20), generateCustomerCode())
    .input('fullName', sql.NVarChar(100), c.fullName)
    .input('phone', sql.NVarChar(20), c.phone || null)
    .input('email', sql.NVarChar(100), c.email || null)
    .input('address', sql.NVarChar(255), c.address || null)
    .input('note', sql.NVarChar(500), c.note || null)
    .query(`
      INSERT INTO Customers (CustomerCode, FullName, Phone, Email, Address, Note)
      OUTPUT INSERTED.CustomerID
      VALUES (@customerCode, @fullName, @phone, @email, @address, @note)
    `);
  return result.recordset[0].CustomerID;
}

async function updateCustomer(customerId, c) {
  const pool = await getPool();
  await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .input('fullName', sql.NVarChar(100), c.fullName)
    .input('phone', sql.NVarChar(20), c.phone || null)
    .input('email', sql.NVarChar(100), c.email || null)
    .input('address', sql.NVarChar(255), c.address || null)
    .input('note', sql.NVarChar(500), c.note || null)
    .query(`
      UPDATE Customers
      SET FullName = @fullName, Phone = @phone, Email = @email, Address = @address, Note = @note
      WHERE CustomerID = @customerId
    `);
}

async function deleteCustomer(customerId) {
  const pool = await getPool();
  await pool.request().input('customerId', sql.Int, customerId).query('DELETE FROM Customers WHERE CustomerID = @customerId');
}

/**
 * Lịch sử mua hàng + lịch sử sửa chữa + tổng chi tiêu + thiết bị từng sửa chữa.
 * RepairOrders/Devices đã có sẵn trong schema từ Giai đoạn 2 — module quản lý
 * sửa chữa đầy đủ (tạo/sửa phiếu) sẽ hoàn thiện ở Giai đoạn 7, nhưng dữ liệu
 * lịch sử có thể đọc được ngay khi đã tồn tại.
 */
async function getHistory(customerId) {
  const pool = await getPool();

  const purchases = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT so.SalesOrderID, so.SalesOrderCode, so.OrderDate, so.TotalAmount, so.DiscountAmount, so.FinalAmount, so.Status,
             (SELECT MAX(sod.WarrantyExpiry) FROM SalesOrderDetails sod WHERE sod.SalesOrderID = so.SalesOrderID AND sod.WarrantyMonths > 0) AS WarrantyExpiry,
             ISNULL((SELECT SUM(Amount) FROM Payments WHERE ReferenceType = 'SALES_ORDER' AND ReferenceID = so.SalesOrderID), 0) AS PaidAmount
      FROM SalesOrders so
      WHERE so.CustomerID = @customerId
      ORDER BY so.OrderDate DESC
    `);

  const repairs = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT ro.RepairOrderID, ro.RepairOrderCode, ro.ReceivedDate, ro.Status, ro.WarrantyMonths, ro.WarrantyExpiry,
             d.DeviceType, d.Brand, d.Model, d.IMEI,
             ISNULL((SELECT SUM(LineTotal) FROM RepairOrderDetails WHERE RepairOrderID = ro.RepairOrderID), 0)
               + ISNULL((SELECT SUM(LineTotal) FROM RepairComponents WHERE RepairOrderID = ro.RepairOrderID AND IsReturned = 0), 0) AS TotalCost,
             ISNULL((SELECT SUM(Amount) FROM Payments WHERE ReferenceType = 'REPAIR_ORDER' AND ReferenceID = ro.RepairOrderID), 0) AS PaidAmount
      FROM RepairOrders ro
      JOIN Devices d ON d.DeviceID = ro.DeviceID
      WHERE ro.CustomerID = @customerId
      ORDER BY ro.ReceivedDate DESC
    `);

  const devices = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT DeviceID, DeviceType, Brand, Model, IMEI, Note
      FROM Devices
      WHERE CustomerID = @customerId
    `);

  const totalSpentResult = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query(`
      SELECT ISNULL(SUM(FinalAmount), 0) AS TotalSpent
      FROM SalesOrders
      WHERE CustomerID = @customerId AND Status = 'COMPLETED'
    `);

  return {
    purchases: purchases.recordset,
    repairs: repairs.recordset,
    devices: devices.recordset,
    totalSpent: totalSpentResult.recordset[0].TotalSpent,
  };
}

module.exports = {
  listCustomers,
  listAll,
  findById,
  findByPhone,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getHistory,
};
