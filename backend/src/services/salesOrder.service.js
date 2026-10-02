/**
 * Service Bán hàng (POS / Sales Orders).
 *
 * createSalesOrder() phải chạy trong DUY NHẤT một transaction: tạo đơn bán,
 * tạo chi tiết, TRỪ tồn kho (không cho phép âm), ghi InventoryTransactions,
 * và ghi Payment — tất cả commit/rollback cùng nhau (mục 9 & 27 tài liệu dự án).
 */
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/apiError');
const { generateCode } = require('../utils/codeGenerator');

async function listSalesOrders({ page = 1, pageSize = 20, customerId, status } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const request = pool.request().input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize);
  let where = 'WHERE 1=1';
  if (customerId) {
    request.input('customerId', sql.Int, customerId);
    where += ' AND so.CustomerID = @customerId';
  }
  if (status) {
    request.input('status', sql.NVarChar(20), status);
    where += ' AND so.Status = @status';
  }

  const result = await request.query(`
    SELECT so.SalesOrderID, so.SalesOrderCode, so.CustomerID, c.FullName AS CustomerName, c.Phone AS CustomerPhone,
           so.CreatedBy, u.FullName AS CreatedByName, so.OrderDate,
           so.TotalAmount, so.DiscountAmount, so.FinalAmount, so.Status,
           ISNULL((SELECT SUM(Amount) FROM Payments WHERE ReferenceType = 'SALES_ORDER' AND ReferenceID = so.SalesOrderID), 0) AS PaidAmount
    FROM SalesOrders so
    LEFT JOIN Customers c ON c.CustomerID = so.CustomerID
    JOIN Users u ON u.UserID = so.CreatedBy
    ${where}
    ORDER BY so.SalesOrderID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM SalesOrders');
  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

async function findById(salesOrderId) {
  const pool = await getPool();
  const orderResult = await pool
    .request()
    .input('id', sql.Int, salesOrderId)
    .query(`
      SELECT so.SalesOrderID, so.SalesOrderCode, so.CustomerID, c.FullName AS CustomerName, c.Phone AS CustomerPhone,
             so.CreatedBy, u.FullName AS CreatedByName, so.OrderDate,
             so.TotalAmount, so.DiscountAmount, so.FinalAmount, so.Status
      FROM SalesOrders so
      LEFT JOIN Customers c ON c.CustomerID = so.CustomerID
      JOIN Users u ON u.UserID = so.CreatedBy
      WHERE so.SalesOrderID = @id
    `);
  const order = orderResult.recordset[0];
  if (!order) return null;

  const detailsResult = await pool
    .request()
    .input('id', sql.Int, salesOrderId)
    .query(`
      SELECT sod.SalesOrderDetailID, sod.ProductID, p.ProductCode, p.ProductName,
             sod.Quantity, sod.UnitPrice, sod.LineTotal, sod.WarrantyMonths, sod.WarrantyExpiry
      FROM SalesOrderDetails sod
      JOIN Products p ON p.ProductID = sod.ProductID
      WHERE sod.SalesOrderID = @id
    `);

  const paymentsResult = await pool
    .request()
    .input('id', sql.Int, salesOrderId)
    .query(`
      SELECT PaymentID, Amount, PaymentMethod, PaymentDate, Note
      FROM Payments
      WHERE ReferenceType = 'SALES_ORDER' AND ReferenceID = @id
    `);

  return { ...order, details: detailsResult.recordset, payments: paymentsResult.recordset };
}

/**
 * Tạo đơn bán hàng hoàn chỉnh (checkout POS).
 * @param {number|null} customerId - null nếu bán cho khách vãng lai
 * @param {number} [paidAmount] - số tiền khách trả ngay lúc bán. Mặc định = finalAmount
 *   (thanh toán đủ, hành vi cũ). Nếu nhỏ hơn finalAmount → phần còn lại là công nợ,
 *   khách có thể trả tiếp sau qua addPayment().
 * @param {Array<{productId, quantity, unitPrice}>} items
 */
async function createSalesOrder({ customerId, createdBy, discountAmount = 0, paymentMethod, paidAmount, items }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const totalAmount = items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
    const finalAmount = totalAmount - discountAmount;
    if (finalAmount < 0) throw new ApiError(400, 'Số tiền giảm giá không được lớn hơn tổng tiền hàng');

    // Mặc định thanh toán đủ (hành vi cũ) nếu không truyền paidAmount.
    // Không cho khách "trả" nhiều hơn thành tiền hoặc số âm.
    const actualPaidAmount = paidAmount === undefined || paidAmount === null
      ? finalAmount
      : Math.min(Math.max(0, Number(paidAmount) || 0), finalAmount);

    const soCode = generateCode('SO');
    const orderDate = new Date();

    const soResult = await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), soCode)
      .input('customerId', sql.Int, customerId || null)
      .input('createdBy', sql.Int, createdBy)
      .input('totalAmount', sql.Decimal(18, 2), totalAmount)
      .input('discountAmount', sql.Decimal(18, 2), discountAmount)
      .query(`
        INSERT INTO SalesOrders (SalesOrderCode, CustomerID, CreatedBy, TotalAmount, DiscountAmount, Status)
        OUTPUT INSERTED.SalesOrderID
        VALUES (@code, @customerId, @createdBy, @totalAmount, @discountAmount, 'COMPLETED')
      `);
    const salesOrderId = soResult.recordset[0].SalesOrderID;

    for (const item of items) {
      const { productId, quantity, unitPrice } = item;
      // Bảo hành (mục "lưu thông tin bảo hành"): mỗi dòng sản phẩm có thể có
      // số tháng bảo hành riêng (0 = không bảo hành). Tính sẵn ngày hết hạn
      // ngay lúc bán để tra cứu nhanh, không cần tính lại từ OrderDate mỗi lần.
      const warrantyMonths = Math.max(0, Number(item.warrantyMonths) || 0);
      let warrantyExpiry = null;
      if (warrantyMonths > 0) {
        warrantyExpiry = new Date(orderDate);
        warrantyExpiry.setMonth(warrantyExpiry.getMonth() + warrantyMonths);
      }

      await new sql.Request(transaction)
        .input('soId', sql.Int, salesOrderId)
        .input('productId', sql.Int, productId)
        .input('quantity', sql.Int, quantity)
        .input('unitPrice', sql.Decimal(18, 2), unitPrice)
        .input('warrantyMonths', sql.Int, warrantyMonths)
        .input('warrantyExpiry', sql.DateTime2, warrantyExpiry)
        .query(`
          INSERT INTO SalesOrderDetails (SalesOrderID, ProductID, Quantity, UnitPrice, WarrantyMonths, WarrantyExpiry)
          VALUES (@soId, @productId, @quantity, @unitPrice, @warrantyMonths, @warrantyExpiry)
        `);

      // Trừ tồn kho — điều kiện WHERE Quantity >= @quantity đảm bảo không bao giờ âm kho.
      const updateResult = await new sql.Request(transaction)
        .input('productId', sql.Int, productId)
        .input('quantity', sql.Int, quantity)
        .query(`
          UPDATE Products
          SET Quantity = Quantity - @quantity, UpdatedAt = SYSDATETIME()
          WHERE ProductID = @productId AND Quantity >= @quantity
        `);

      if (updateResult.rowsAffected[0] === 0) {
        const checkResult = await new sql.Request(transaction)
          .input('productId', sql.Int, productId)
          .query('SELECT ProductName, Quantity FROM Products WHERE ProductID = @productId');

        if (checkResult.recordset.length === 0) {
          throw new ApiError(404, `Không tìm thấy sản phẩm với ID ${productId}`);
        }
        const { ProductName, Quantity } = checkResult.recordset[0];
        throw new ApiError(400, `Sản phẩm "${ProductName}" không đủ tồn kho. Hiện còn ${Quantity}, yêu cầu bán ${quantity}`);
      }

      const txCode = generateCode('TX');
      await new sql.Request(transaction)
        .input('code', sql.NVarChar(30), txCode)
        .input('itemId', sql.Int, productId)
        .input('quantity', sql.Int, quantity)
        .input('performedBy', sql.Int, createdBy)
        .input('referenceId', sql.Int, salesOrderId)
        .input('reason', sql.NVarChar(255), `Bán hàng theo đơn ${soCode}`)
        .query(`
          INSERT INTO InventoryTransactions
            (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason)
          VALUES
            (@code, 'SALE', 'PRODUCT', @itemId, @quantity, @performedBy, 'SALES_ORDER', @referenceId, @reason)
        `);
    }

    if (actualPaidAmount > 0) {
      await new sql.Request(transaction)
        .input('referenceId', sql.Int, salesOrderId)
        .input('amount', sql.Decimal(18, 2), actualPaidAmount)
        .input('paymentMethod', sql.NVarChar(20), paymentMethod)
        .query(`
          INSERT INTO Payments (ReferenceType, ReferenceID, Amount, PaymentMethod)
          VALUES ('SALES_ORDER', @referenceId, @amount, @paymentMethod)
        `);
    }

    await transaction.commit();
    return {
      salesOrderId, salesOrderCode: soCode, totalAmount, discountAmount, finalAmount,
      paidAmount: actualPaidAmount, remainingAmount: finalAmount - actualPaidAmount,
    };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Ghi nhận thêm 1 lần thanh toán cho đơn bán hàng đã tạo (khách trả nợ dần).
 * Chặn không cho trả vượt quá số tiền còn nợ để tránh nhập nhầm.
 */
async function addPayment({ salesOrderId, amount, paymentMethod, note }) {
  const pool = await getPool();

  const orderResult = await pool
    .request()
    .input('id', sql.Int, salesOrderId)
    .query('SELECT FinalAmount FROM SalesOrders WHERE SalesOrderID = @id');
  const order = orderResult.recordset[0];
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn bán hàng');

  const paidResult = await pool
    .request()
    .input('id', sql.Int, salesOrderId)
    .query(`SELECT ISNULL(SUM(Amount), 0) AS PaidAmount FROM Payments WHERE ReferenceType = 'SALES_ORDER' AND ReferenceID = @id`);
  const alreadyPaid = paidResult.recordset[0].PaidAmount;
  const remaining = Number(order.FinalAmount) - Number(alreadyPaid);

  if (Number(amount) > remaining) {
    throw new ApiError(400, `Số tiền vượt quá công nợ còn lại (còn nợ ${remaining.toLocaleString('vi-VN')} đ)`);
  }

  await pool
    .request()
    .input('referenceId', sql.Int, salesOrderId)
    .input('amount', sql.Decimal(18, 2), amount)
    .input('paymentMethod', sql.NVarChar(20), paymentMethod)
    .input('note', sql.NVarChar(255), note || null)
    .query(`
      INSERT INTO Payments (ReferenceType, ReferenceID, Amount, PaymentMethod, Note)
      VALUES ('SALES_ORDER', @referenceId, @amount, @paymentMethod, @note)
    `);
}

module.exports = { listSalesOrders, findById, createSalesOrder, addPayment };
