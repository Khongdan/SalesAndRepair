/**
 * Service quản lý kho — trung tâm của mọi thay đổi tồn kho.
 *
 * Nguyên tắc bắt buộc (theo mục 7 & 27 tài liệu dự án):
 * - Mọi thay đổi Quantity trên Products PHẢI đi kèm 1 dòng
 *   InventoryTransactions, và cả hai thao tác phải nằm trong CÙNG 1
 *   database transaction (commit/rollback cùng nhau).
 * - Không cho phép tồn kho âm — kiểm tra trước khi trừ, trong transaction,
 *   để tránh race condition giữa lúc kiểm tra và lúc trừ (dùng UPDATE có
 *   điều kiện WHERE Quantity >= @qty rồi kiểm tra rowsAffected).
 *
 * Lưu ý: trước đây có cả Products và Components (2 danh mục riêng), nay đã
 * GỘP làm 1 ("Sản phẩm") — ItemType chỉ còn 'PRODUCT'. Giữ cấu trúc
 * TABLE_BY_ITEM_TYPE dạng map để nếu sau này cần thêm loại khác thì mở rộng dễ dàng.
 */
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/apiError');

const TABLE_BY_ITEM_TYPE = {
  PRODUCT: { table: 'Products', idColumn: 'ProductID' },
};

function assertValidItemType(itemType) {
  if (!TABLE_BY_ITEM_TYPE[itemType]) {
    throw new ApiError(400, `ItemType không hợp lệ: ${itemType}`);
  }
}

function generateTransactionCode() {
  // Đơn giản, đủ dùng cho dự án sinh viên: TX + timestamp + số ngẫu nhiên.
  const rand = Math.floor(Math.random() * 900 + 100);
  return `TX${Date.now()}${rand}`;
}

/**
 * Tăng tồn kho (IMPORT hoặc REPAIR_RETURN) trong 1 transaction.
 */
async function increaseStock({ itemType, itemId, quantity, performedBy, transactionType = 'IMPORT', referenceType, referenceId, reason, note }) {
  assertValidItemType(itemType);
  if (quantity <= 0) throw new ApiError(400, 'Số lượng phải lớn hơn 0');

  const { table, idColumn } = TABLE_BY_ITEM_TYPE[itemType];
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const updateResult = await new sql.Request(transaction)
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Int, quantity)
      .query(`UPDATE ${table} SET Quantity = Quantity + @quantity, UpdatedAt = SYSDATETIME() WHERE ${idColumn} = @itemId`);

    if (updateResult.rowsAffected[0] === 0) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID ${itemId}`);
    }

    const txCode = generateTransactionCode();
    await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), txCode)
      .input('transactionType', sql.NVarChar(20), transactionType)
      .input('itemType', sql.NVarChar(20), itemType)
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Int, quantity)
      .input('performedBy', sql.Int, performedBy)
      .input('referenceType', sql.NVarChar(30), referenceType || null)
      .input('referenceId', sql.Int, referenceId || null)
      .input('reason', sql.NVarChar(255), reason || null)
      .input('note', sql.NVarChar(500), note || null)
      .query(`
        INSERT INTO InventoryTransactions
          (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason, Note)
        VALUES
          (@code, @transactionType, @itemType, @itemId, @quantity, @performedBy, @referenceType, @referenceId, @reason, @note)
      `);

    await transaction.commit();
    return { transactionCode: txCode };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Giảm tồn kho (EXPORT, SALE, REPAIR_USE) trong 1 transaction.
 * Điều kiện WHERE Quantity >= @quantity trong câu UPDATE đảm bảo không bao giờ
 * tồn kho bị âm, kể cả khi có nhiều request đồng thời.
 */
async function decreaseStock({ itemType, itemId, quantity, performedBy, transactionType = 'EXPORT', referenceType, referenceId, reason, note }) {
  assertValidItemType(itemType);
  if (quantity <= 0) throw new ApiError(400, 'Số lượng phải lớn hơn 0');

  const { table, idColumn } = TABLE_BY_ITEM_TYPE[itemType];
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const updateResult = await new sql.Request(transaction)
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Int, quantity)
      .query(`
        UPDATE ${table}
        SET Quantity = Quantity - @quantity, UpdatedAt = SYSDATETIME()
        WHERE ${idColumn} = @itemId AND Quantity >= @quantity
      `);

    if (updateResult.rowsAffected[0] === 0) {
      // Có thể do không tồn tại item, hoặc tồn kho không đủ — phân biệt để trả lỗi rõ ràng.
      const checkResult = await new sql.Request(transaction)
        .input('itemId', sql.Int, itemId)
        .query(`SELECT Quantity FROM ${table} WHERE ${idColumn} = @itemId`);

      if (checkResult.recordset.length === 0) {
        throw new ApiError(404, `Không tìm thấy sản phẩm với ID ${itemId}`);
      }
      throw new ApiError(400, `Không đủ tồn kho. Hiện còn ${checkResult.recordset[0].Quantity}, yêu cầu xuất ${quantity}`);
    }

    const txCode = generateTransactionCode();
    await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), txCode)
      .input('transactionType', sql.NVarChar(20), transactionType)
      .input('itemType', sql.NVarChar(20), itemType)
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Int, quantity)
      .input('performedBy', sql.Int, performedBy)
      .input('referenceType', sql.NVarChar(30), referenceType || null)
      .input('referenceId', sql.Int, referenceId || null)
      .input('reason', sql.NVarChar(255), reason || null)
      .input('note', sql.NVarChar(500), note || null)
      .query(`
        INSERT INTO InventoryTransactions
          (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason, Note)
        VALUES
          (@code, @transactionType, @itemType, @itemId, @quantity, @performedBy, @referenceType, @referenceId, @reason, @note)
      `);

    await transaction.commit();
    return { transactionCode: txCode };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Điều chỉnh tồn kho về một số lượng cụ thể (kiểm kê).
 * Tính chênh lệch rồi ghi 1 dòng ADJUST — Note lưu rõ giá trị cũ/mới vì cột
 * Quantity trong InventoryTransactions luôn dương (CHECK > 0) nên không thể
 * lưu số âm trực tiếp.
 */
async function adjustStock({ itemType, itemId, newQuantity, performedBy, reason, note }) {
  assertValidItemType(itemType);
  if (newQuantity < 0) throw new ApiError(400, 'Số lượng mới không được âm');

  const { table, idColumn } = TABLE_BY_ITEM_TYPE[itemType];
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const currentResult = await new sql.Request(transaction)
      .input('itemId', sql.Int, itemId)
      .query(`SELECT Quantity FROM ${table} WHERE ${idColumn} = @itemId`);

    if (currentResult.recordset.length === 0) {
      throw new ApiError(404, `Không tìm thấy sản phẩm với ID ${itemId}`);
    }

    const currentQuantity = currentResult.recordset[0].Quantity;
    const diff = newQuantity - currentQuantity;

    if (diff === 0) {
      await transaction.commit();
      return { transactionCode: null, message: 'Số lượng không đổi, không cần điều chỉnh' };
    }

    await new sql.Request(transaction)
      .input('itemId', sql.Int, itemId)
      .input('newQuantity', sql.Int, newQuantity)
      .query(`UPDATE ${table} SET Quantity = @newQuantity, UpdatedAt = SYSDATETIME() WHERE ${idColumn} = @itemId`);

    const txCode = generateTransactionCode();
    const autoNote = `Điều chỉnh từ ${currentQuantity} thành ${newQuantity} (${diff > 0 ? '+' : ''}${diff})`;

    await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), txCode)
      .input('itemType', sql.NVarChar(20), itemType)
      .input('itemId', sql.Int, itemId)
      .input('quantity', sql.Int, Math.abs(diff))
      .input('performedBy', sql.Int, performedBy)
      .input('reason', sql.NVarChar(255), reason || null)
      .input('note', sql.NVarChar(500), note ? `${note} — ${autoNote}` : autoNote)
      .query(`
        INSERT INTO InventoryTransactions
          (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, Reason, Note)
        VALUES
          (@code, 'ADJUST', @itemType, @itemId, @quantity, @performedBy, @reason, @note)
      `);

    await transaction.commit();
    return { transactionCode: txCode };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function listTransactions({ page = 1, pageSize = 20, itemType, itemId, transactionType } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const request = pool.request().input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize);
  let where = 'WHERE 1=1';
  if (itemType) {
    request.input('itemType', sql.NVarChar(20), itemType);
    where += ' AND it.ItemType = @itemType';
  }
  if (itemId) {
    request.input('itemId', sql.Int, itemId);
    where += ' AND it.ItemID = @itemId';
  }
  if (transactionType) {
    request.input('transactionType', sql.NVarChar(20), transactionType);
    where += ' AND it.TransactionType = @transactionType';
  }

  const result = await request.query(`
    SELECT it.TransactionID, it.TransactionCode, it.TransactionType, it.ItemType, it.ItemID,
           it.Quantity, it.PerformedBy, u.FullName AS PerformedByName, it.ReferenceType,
           it.ReferenceID, it.TransactionDate, it.Reason, it.Note
    FROM InventoryTransactions it
    JOIN Users u ON u.UserID = it.PerformedBy
    ${where}
    ORDER BY it.TransactionID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  return { items: result.recordset, page, pageSize };
}

async function getLowStockSummary() {
  const pool = await getPool();
  const products = await pool.request().query(`
    SELECT ProductID AS ItemID, 'PRODUCT' AS ItemType, ProductCode AS Code, ProductName AS Name, Quantity, MinStock
    FROM Products WHERE Quantity <= MinStock AND Status = 'ACTIVE'
  `);
  return products.recordset;
}

module.exports = {
  increaseStock,
  decreaseStock,
  adjustStock,
  listTransactions,
  getLowStockSummary,
};
