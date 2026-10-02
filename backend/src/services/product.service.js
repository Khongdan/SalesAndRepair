/**
 * Service dữ liệu Products. Toàn bộ query dùng parameterized input
 * để chống SQL Injection. Việc trừ/cộng Quantity liên quan tồn kho
 * KHÔNG nằm ở đây — được thực hiện trong inventory.service.js kèm transaction.
 */
const { sql, getPool } = require('../config/db');

async function listProducts({ page = 1, pageSize = 20, search = '', categoryId, status } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const request = pool
    .request()
    .input('offset', sql.Int, offset)
    .input('pageSize', sql.Int, pageSize)
    .input('search', sql.NVarChar(150), `%${search}%`);

  let where = 'WHERE (p.ProductName LIKE @search OR p.ProductCode LIKE @search)';
  if (categoryId) {
    request.input('categoryId', sql.Int, categoryId);
    where += ' AND p.CategoryID = @categoryId';
  }
  if (status) {
    request.input('status', sql.NVarChar(20), status);
    where += ' AND p.Status = @status';
  }

  const result = await request.query(`
    SELECT p.ProductID, p.ProductCode, p.ProductName, p.CategoryID, c.CategoryName,
           p.Brand, p.Model, p.ImportPrice, p.SalePrice, p.Quantity, p.MinStock,
           p.Unit, p.Description, p.ImageURL, p.Location, p.Status, p.CreatedAt
    FROM Products p
    LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
    ${where}
    ORDER BY p.ProductID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const countRequest = pool.request().input('search', sql.NVarChar(150), `%${search}%`);
  let countWhere = 'WHERE (ProductName LIKE @search OR ProductCode LIKE @search)';
  if (categoryId) {
    countRequest.input('categoryId', sql.Int, categoryId);
    countWhere += ' AND CategoryID = @categoryId';
  }
  if (status) {
    countRequest.input('status', sql.NVarChar(20), status);
    countWhere += ' AND Status = @status';
  }
  const countResult = await countRequest.query(`SELECT COUNT(*) AS total FROM Products ${countWhere}`);

  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

async function findById(productId) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('productId', sql.Int, productId)
    .query(`
      SELECT p.ProductID, p.ProductCode, p.ProductName, p.CategoryID, c.CategoryName,
             p.Brand, p.Model, p.ImportPrice, p.SalePrice, p.Quantity, p.MinStock,
             p.Unit, p.Description, p.ImageURL, p.Location, p.Status, p.CreatedAt, p.UpdatedAt
      FROM Products p
      LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
      WHERE p.ProductID = @productId
    `);
  return result.recordset[0] || null;
}

async function findByCode(productCode) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('productCode', sql.NVarChar(30), productCode)
    .query('SELECT ProductID FROM Products WHERE ProductCode = @productCode');
  return result.recordset[0] || null;
}

/**
 * Dữ liệu công khai cho trang quét mã QR (không cần đăng nhập) — khách hàng
 * bất kỳ quét mã dán trên xe/máy đều xem được. CHỈ trả về các trường an
 * toàn để lộ ra ngoài: KHÔNG có ImportPrice (giá nhập, thông tin kinh doanh
 * nhạy cảm) và KHÔNG có số lượng tồn kho chính xác (chỉ có/hết hàng).
 * Chỉ trả sản phẩm đang ACTIVE — sản phẩm ngừng kinh doanh không hiện ra.
 */
async function findPublicByCode(productCode) {
  const pool = await getPool();
  const result = await pool
    .request()
    .input('productCode', sql.NVarChar(30), productCode)
    .query(`
      SELECT p.ProductCode, p.ProductName, p.Brand, p.Model, p.SalePrice,
             p.Unit, p.Description, p.ImageURL, c.CategoryName,
             CASE WHEN p.Quantity > 0 THEN 1 ELSE 0 END AS InStock
      FROM Products p
      LEFT JOIN Categories c ON c.CategoryID = p.CategoryID
      WHERE p.ProductCode = @productCode AND p.Status = 'ACTIVE'
    `);
  return result.recordset[0] || null;
}

async function listLowStock() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT ProductID, ProductCode, ProductName, Quantity, MinStock
    FROM Products
    WHERE Quantity <= MinStock AND Status = 'ACTIVE'
    ORDER BY (Quantity - MinStock) ASC
  `);
  return result.recordset;
}

/**
 * Tự sinh mã sản phẩm dạng SP001, SP002... (đúng định dạng seed data có sẵn).
 * Người dùng KHÔNG tự nhập mã — máy luôn tự tăng dựa trên mã lớn nhất hiện có.
 */
async function generateProductCode() {
  const pool = await getPool();
  const result = await pool.request().query(`
    SELECT TOP 1 ProductCode FROM Products
    WHERE ProductCode LIKE 'SP[0-9][0-9][0-9]%'
    ORDER BY LEN(ProductCode) DESC, ProductCode DESC
  `);
  const lastCode = result.recordset[0]?.ProductCode;
  const lastNumber = lastCode ? parseInt(lastCode.replace(/^SP/, ''), 10) || 0 : 0;
  const nextNumber = lastNumber + 1;
  return `SP${String(nextNumber).padStart(3, '0')}`;
}

async function createProduct(p) {
  const pool = await getPool();
  // Thử tối đa 5 lần phòng trường hợp đụng độ mã do 2 người tạo cùng lúc
  // (race condition) — ProductCode có ràng buộc UNIQUE ở DB nên lần lặp
  // sau sẽ tự sinh mã mới lớn hơn.
  let lastError;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const productCode = await generateProductCode();
    try {
      const result = await pool
        .request()
        .input('productCode', sql.NVarChar(30), productCode)
        .input('productName', sql.NVarChar(150), p.productName)
        .input('categoryId', sql.Int, p.categoryId || null)
        .input('brand', sql.NVarChar(100), p.brand || null)
        .input('model', sql.NVarChar(100), p.model || null)
        .input('importPrice', sql.Decimal(18, 2), p.importPrice || 0)
        .input('salePrice', sql.Decimal(18, 2), p.salePrice || 0)
        .input('quantity', sql.Int, p.quantity || 0)
        .input('minStock', sql.Int, p.minStock || 0)
        .input('unit', sql.NVarChar(20), p.unit || 'Cái')
        .input('description', sql.NVarChar(1000), p.description || null)
        .input('imageUrl', sql.NVarChar(500), p.imageUrl || null)
        .input('location', sql.NVarChar(100), p.location || null)
        .query(`
          INSERT INTO Products
            (ProductCode, ProductName, CategoryID, Brand, Model, ImportPrice, SalePrice,
             Quantity, MinStock, Unit, Description, ImageURL, Location)
          OUTPUT INSERTED.ProductID
          VALUES
            (@productCode, @productName, @categoryId, @brand, @model, @importPrice, @salePrice,
             @quantity, @minStock, @unit, @description, @imageUrl, @location)
        `);
      return result.recordset[0].ProductID;
    } catch (err) {
      // Lỗi vi phạm UNIQUE constraint của SQL Server có số 2627/2601 — thử lại với mã mới.
      const isDuplicateCode = err?.number === 2627 || err?.number === 2601;
      if (!isDuplicateCode) throw err;
      lastError = err;
    }
  }
  throw lastError;
}

async function updateProduct(productId, p) {
  const pool = await getPool();
  await pool
    .request()
    .input('productId', sql.Int, productId)
    .input('productName', sql.NVarChar(150), p.productName)
    .input('categoryId', sql.Int, p.categoryId || null)
    .input('brand', sql.NVarChar(100), p.brand || null)
    .input('model', sql.NVarChar(100), p.model || null)
    .input('importPrice', sql.Decimal(18, 2), p.importPrice || 0)
    .input('salePrice', sql.Decimal(18, 2), p.salePrice || 0)
    .input('minStock', sql.Int, p.minStock || 0)
    .input('unit', sql.NVarChar(20), p.unit || 'Cái')
    .input('description', sql.NVarChar(1000), p.description || null)
    .input('imageUrl', sql.NVarChar(500), p.imageUrl || null)
    .input('location', sql.NVarChar(100), p.location || null)
    .input('status', sql.NVarChar(20), p.status || 'ACTIVE')
    .query(`
      UPDATE Products
      SET ProductName = @productName, CategoryID = @categoryId, Brand = @brand, Model = @model,
          ImportPrice = @importPrice, SalePrice = @salePrice, MinStock = @minStock, Unit = @unit,
          Description = @description, ImageURL = @imageUrl, Location = @location, Status = @status,
          UpdatedAt = SYSDATETIME()
      WHERE ProductID = @productId
    `);
  // Lưu ý: Quantity KHÔNG được cập nhật trực tiếp qua endpoint này —
  // mọi thay đổi tồn kho phải đi qua module Inventory (nhập/xuất/điều chỉnh) để đảm bảo có lịch sử.
}

async function softDeleteProduct(productId) {
  const pool = await getPool();
  await pool
    .request()
    .input('productId', sql.Int, productId)
    .query("UPDATE Products SET Status = 'DISCONTINUED', UpdatedAt = SYSDATETIME() WHERE ProductID = @productId");
}

module.exports = {
  listProducts,
  findById,
  findByCode,
  findPublicByCode,
  listLowStock,
  generateProductCode,
  createProduct,
  updateProduct,
  softDeleteProduct,
};
