/**
 * Service Cài đặt cửa hàng — chỉ có ĐÚNG 1 dòng (StoreSettingsID = 1),
 * dùng cho thông tin hiển thị trên hóa đơn/phiếu sửa chữa sau này.
 */
const { sql, getPool } = require('../config/db');

async function getStoreSettings() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT StoreSettingsID, StoreName, Address, Phone, Email, TaxCode, LogoURL,
           PaymentQrBankBin, PaymentQrAccountNumber, PaymentQrAccountName, PaymentQrImageURL, UpdatedAt
    FROM StoreSettings WHERE StoreSettingsID = 1
  `);
  return result.recordset[0] || null;
}

async function updateStoreSettings({
  storeName, address, phone, email, taxCode, logoUrl,
  paymentQrBankBin, paymentQrAccountNumber, paymentQrAccountName, paymentQrImageUrl, updatedBy,
}) {
  const pool = await getPool();
  await pool
    .request()
    .input('storeName', sql.NVarChar(150), storeName)
    .input('address', sql.NVarChar(255), address || null)
    .input('phone', sql.NVarChar(20), phone || null)
    .input('email', sql.NVarChar(100), email || null)
    .input('taxCode', sql.NVarChar(50), taxCode || null)
    .input('logoUrl', sql.NVarChar(500), logoUrl || null)
    .input('paymentQrBankBin', sql.NVarChar(20), paymentQrBankBin || null)
    .input('paymentQrAccountNumber', sql.NVarChar(50), paymentQrAccountNumber || null)
    .input('paymentQrAccountName', sql.NVarChar(100), paymentQrAccountName || null)
    .input('paymentQrImageUrl', sql.NVarChar(500), paymentQrImageUrl || null)
    .input('updatedBy', sql.Int, updatedBy)
    .query(`
      UPDATE StoreSettings
      SET StoreName = @storeName, Address = @address, Phone = @phone, Email = @email,
          TaxCode = @taxCode, LogoURL = @logoUrl,
          PaymentQrBankBin = @paymentQrBankBin, PaymentQrAccountNumber = @paymentQrAccountNumber,
          PaymentQrAccountName = @paymentQrAccountName, PaymentQrImageURL = @paymentQrImageUrl,
          UpdatedAt = SYSDATETIME(), UpdatedBy = @updatedBy
      WHERE StoreSettingsID = 1
    `);
}

module.exports = { getStoreSettings, updateStoreSettings };
