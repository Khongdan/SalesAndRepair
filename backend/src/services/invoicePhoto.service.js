/**
 * Service "Đối chiếu hàng nhập bằng ảnh" — thay thế hoàn toàn module Nhập
 * hàng (PurchaseOrders) + Nhà cung cấp (Suppliers) cũ đã bị loại bỏ.
 *
 * Ý tưởng: thay vì nhập liệu chi tiết từng dòng hàng theo nhà cung cấp, cửa
 * hàng chỉ cần CHỤP/TẢI ẢNH hóa đơn nhập hàng lên, gắn theo ngày — khi cần
 * đối chiếu lại (khách khiếu nại, kiểm kê, quyết toán cuối tháng...) chỉ
 * cần mở đúng ngày ra xem ảnh hóa đơn gốc. Số lượng tồn kho thực tế vẫn
 * được cập nhật qua chức năng "Nhập kho" sẵn có trong Kho hàng
 * (inventory.service.js#increaseStock) — 2 việc tách biệt nhau.
 */
const { sql, getPool } = require('../config/db');

async function listByDate(photoDate) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('photoDate', sql.Date, photoDate)
    .query(`
      SELECT p.PhotoID, p.PhotoDate, p.ImageURL, p.Note, p.UploadedBy, u.FullName AS UploadedByName, p.CreatedAt
      FROM IncomingInvoicePhotos p
      JOIN Users u ON u.UserID = p.UploadedBy
      WHERE p.PhotoDate = @photoDate
      ORDER BY p.CreatedAt DESC
    `);
  return result.recordset;
}

/**
 * Danh sách các ngày có ảnh (dùng để hiện chấm/đếm trên lịch chọn ngày phía
 * frontend) kèm số lượng ảnh mỗi ngày, trong 1 khoảng thời gian.
 */
async function listDatesSummary({ fromDate, toDate } = {}) {
  const pool = await getPool();
  const request = pool.request();
  let where = 'WHERE 1=1';
  if (fromDate) {
    request.input('fromDate', sql.Date, fromDate);
    where += ' AND PhotoDate >= @fromDate';
  }
  if (toDate) {
    request.input('toDate', sql.Date, toDate);
    where += ' AND PhotoDate <= @toDate';
  }
  const result = await request.query(`
    SELECT PhotoDate, COUNT(*) AS PhotoCount
    FROM IncomingInvoicePhotos
    ${where}
    GROUP BY PhotoDate
    ORDER BY PhotoDate DESC
  `);
  return result.recordset;
}

async function findById(photoId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('photoId', sql.Int, photoId)
    .query('SELECT PhotoID, ImageURL, UploadedBy FROM IncomingInvoicePhotos WHERE PhotoID = @photoId');
  return result.recordset[0] || null;
}

async function createPhoto({ photoDate, imageUrl, note, uploadedBy }) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('photoDate', sql.Date, photoDate)
    .input('imageUrl', sql.NVarChar(500), imageUrl)
    .input('note', sql.NVarChar(500), note || null)
    .input('uploadedBy', sql.Int, uploadedBy)
    .query(`
      INSERT INTO IncomingInvoicePhotos (PhotoDate, ImageURL, Note, UploadedBy)
      OUTPUT INSERTED.PhotoID
      VALUES (@photoDate, @imageUrl, @note, @uploadedBy)
    `);
  return result.recordset[0].PhotoID;
}

async function deletePhoto(photoId) {
  const pool = await getPool();
  await pool.request().input('photoId', sql.Int, photoId).query('DELETE FROM IncomingInvoicePhotos WHERE PhotoID = @photoId');
}

module.exports = { listByDate, listDatesSummary, findById, createPhoto, deletePhoto };
