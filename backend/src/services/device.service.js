/**
 * Service Devices — thiết bị của khách hàng, gắn với phiếu sửa chữa.
 */
const { sql, getPool } = require('../config/db');

async function listByCustomer(customerId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('customerId', sql.Int, customerId)
    .query('SELECT DeviceID, DeviceType, Brand, Model, IMEI, Note FROM Devices WHERE CustomerID = @customerId ORDER BY DeviceID DESC');
  return result.recordset;
}

async function findById(deviceId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('deviceId', sql.Int, deviceId)
    .query('SELECT DeviceID, CustomerID, DeviceType, Brand, Model, IMEI, Note FROM Devices WHERE DeviceID = @deviceId');
  return result.recordset[0] || null;
}

/**
 * Tạo thiết bị mới trong 1 request (request/transaction có sẵn) —
 * dùng chung khi tạo phiếu sửa chữa để cả hai cùng nằm trong 1 transaction.
 */
async function createDeviceInRequest(request, { customerId, deviceType, brand, model, imei, note }) {
  const result = await request
    .input('customerId', sql.Int, customerId)
    .input('deviceType', sql.NVarChar(50), deviceType)
    .input('brand', sql.NVarChar(100), brand || null)
    .input('model', sql.NVarChar(100), model || null)
    .input('imei', sql.NVarChar(50), imei || null)
    .input('note', sql.NVarChar(500), note || null)
    .query(`
      INSERT INTO Devices (CustomerID, DeviceType, Brand, Model, IMEI, Note)
      OUTPUT INSERTED.DeviceID
      VALUES (@customerId, @deviceType, @brand, @model, @imei, @note)
    `);
  return result.recordset[0].DeviceID;
}

async function createDevice(d) {
  const pool = await getPool();
  return createDeviceInRequest(pool.request(), d);
}

module.exports = { listByCustomer, findById, createDevice, createDeviceInRequest };
