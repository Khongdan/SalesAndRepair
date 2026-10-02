/**
 * Service cho bảng RepairServices — danh mục CÔNG sửa chữa (không phải linh kiện).
 * Đặt tên file khác "repairOrder.service.js" để tránh nhầm lẫn.
 */
const { sql, getPool } = require('../config/db');

async function listServices() {
  const pool = await getPool();
  const result = await pool.request().query(
    'SELECT RepairServiceID, ServiceName, DefaultPrice, Description FROM RepairServices ORDER BY ServiceName'
  );
  return result.recordset;
}

async function findById(repairServiceId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('id', sql.Int, repairServiceId)
    .query('SELECT RepairServiceID, ServiceName, DefaultPrice, Description FROM RepairServices WHERE RepairServiceID = @id');
  return result.recordset[0] || null;
}

async function createService(s) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('serviceName', sql.NVarChar(150), s.serviceName)
    .input('defaultPrice', sql.Decimal(18, 2), s.defaultPrice || 0)
    .input('description', sql.NVarChar(255), s.description || null)
    .query(`
      INSERT INTO RepairServices (ServiceName, DefaultPrice, Description)
      OUTPUT INSERTED.RepairServiceID
      VALUES (@serviceName, @defaultPrice, @description)
    `);
  return result.recordset[0].RepairServiceID;
}

async function updateService(repairServiceId, s) {
  const pool = await getPool();
  await pool
    .request()
    .input('id', sql.Int, repairServiceId)
    .input('serviceName', sql.NVarChar(150), s.serviceName)
    .input('defaultPrice', sql.Decimal(18, 2), s.defaultPrice || 0)
    .input('description', sql.NVarChar(255), s.description || null)
    .query(`
      UPDATE RepairServices
      SET ServiceName = @serviceName, DefaultPrice = @defaultPrice, Description = @description
      WHERE RepairServiceID = @id
    `);
}

async function deleteService(repairServiceId) {
  const pool = await getPool();
  await pool.request().input('id', sql.Int, repairServiceId).query('DELETE FROM RepairServices WHERE RepairServiceID = @id');
}

module.exports = { listServices, findById, createService, updateService, deleteService };
