/**
 * Service Sửa chữa — module quan trọng nhất bên cạnh Bán hàng (mục 11 tài liệu dự án).
 *
 * Các thao tác làm thay đổi tồn kho (dùng linh kiện / hoàn kho linh kiện) LUÔN
 * chạy trong 1 database transaction, theo đúng nguyên tắc đã áp dụng xuyên suốt
 * dự án (Products/Components/Inventory/Purchases/Sales).
 */
const { sql, getPool } = require('../config/db');
const ApiError = require('../utils/apiError');
const deviceService = require('./device.service');
const customerService = require('./customer.service');
const { generateCode } = require('../utils/codeGenerator');

// Chỉ còn 4 trạng thái cho gọn. (CHECK constraint trong DB vẫn cho phép các
// giá trị cũ để phiếu đã tạo trước đây không bị lỗi.)
const VALID_STATUSES = ['Tiếp nhận', 'Đang sửa', 'Đã sửa xong', 'Đã giao khách'];

// ---------------------------------------------------------------------------
// Repair Orders — CRUD & trạng thái
// ---------------------------------------------------------------------------

async function listRepairOrders({ page = 1, pageSize = 20, status, customerId } = {}) {
  const pool = await getPool();
  const offset = (page - 1) * pageSize;

  const request = pool.request().input('offset', sql.Int, offset).input('pageSize', sql.Int, pageSize);
  let where = 'WHERE 1=1';
  if (status) {
    request.input('status', sql.NVarChar(30), status);
    where += ' AND ro.Status = @status';
  }
  if (customerId) {
    request.input('customerId', sql.Int, customerId);
    where += ' AND ro.CustomerID = @customerId';
  }

  const result = await request.query(`
    SELECT ro.RepairOrderID, ro.RepairOrderCode, ro.CustomerID, c.FullName AS CustomerName, c.Phone AS CustomerPhone,
           ro.DeviceID, d.DeviceType, d.Brand, d.Model,
           ro.ReceivedDate, ro.ExpectedDate, ro.CompletedDate, ro.Status, ro.WarrantyMonths, ro.WarrantyExpiry,
           ISNULL((SELECT SUM(LineTotal) FROM RepairOrderDetails WHERE RepairOrderID = ro.RepairOrderID), 0)
             + ISNULL((SELECT SUM(LineTotal) FROM RepairComponents WHERE RepairOrderID = ro.RepairOrderID AND IsReturned = 0), 0) AS TotalCost,
           ISNULL((SELECT SUM(Amount) FROM Payments WHERE ReferenceType = 'REPAIR_ORDER' AND ReferenceID = ro.RepairOrderID), 0) AS PaidAmount
    FROM RepairOrders ro
    JOIN Customers c ON c.CustomerID = ro.CustomerID
    JOIN Devices d ON d.DeviceID = ro.DeviceID
    ${where}
    ORDER BY ro.RepairOrderID DESC
    OFFSET @offset ROWS FETCH NEXT @pageSize ROWS ONLY
  `);

  const countResult = await pool.request().query('SELECT COUNT(*) AS total FROM RepairOrders');
  return { items: result.recordset, total: countResult.recordset[0].total, page, pageSize };
}

async function findById(repairOrderId) {
  const pool = await getPool();

  const orderResult = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT ro.RepairOrderID, ro.RepairOrderCode, ro.CustomerID, c.FullName AS CustomerName, c.Phone AS CustomerPhone,
             ro.DeviceID, d.DeviceType, d.Brand, d.Model, d.IMEI,
             ro.ReceivedDate, ro.ExpectedDate, ro.CompletedDate,
             ro.InitialCondition, ro.ReportedIssue, ro.Accessories, ro.ImageURL,
             ro.Status, ro.Note, ro.WarrantyMonths, ro.WarrantyExpiry, ro.CreatedBy, u.FullName AS CreatedByName
      FROM RepairOrders ro
      JOIN Customers c ON c.CustomerID = ro.CustomerID
      JOIN Devices d ON d.DeviceID = ro.DeviceID
      JOIN Users u ON u.UserID = ro.CreatedBy
      WHERE ro.RepairOrderID = @id
    `);
  const order = orderResult.recordset[0];
  if (!order) return null;

  const services = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT rod.RepairOrderDetailID, rod.RepairServiceID, rs.ServiceName, rod.Quantity, rod.UnitPrice, rod.LineTotal
      FROM RepairOrderDetails rod
      JOIN RepairServices rs ON rs.RepairServiceID = rod.RepairServiceID
      WHERE rod.RepairOrderID = @id
    `);

  // "comp" ở đây là Products (đã gộp Linh kiện + Sản phẩm) — alias cột
  // ProductCode/ProductName thành ComponentCode/ComponentName để giữ nguyên
  // hình dạng dữ liệu trả về cho frontend, đỡ phải sửa lại toàn bộ giao diện.
  const components = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT rc.RepairComponentID, rc.ComponentID, comp.ProductCode AS ComponentCode, comp.ProductName AS ComponentName,
             rc.Quantity, rc.UnitPrice, rc.LineTotal, rc.IsReturned
      FROM RepairComponents rc
      JOIN Products comp ON comp.ProductID = rc.ComponentID
      WHERE rc.RepairOrderID = @id
    `);

  const quotes = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT PriceQuoteID, QuoteDate, LaborCost, ComponentCost, DiscountAmount, TotalAmount, CustomerDecision, DecisionDate
      FROM PriceQuotes
      WHERE RepairOrderID = @id
      ORDER BY PriceQuoteID DESC
    `);

  const payments = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT PaymentID, Amount, PaymentMethod, PaymentDate, Note
      FROM Payments
      WHERE ReferenceType = 'REPAIR_ORDER' AND ReferenceID = @id
    `);

  return {
    ...order,
    services: services.recordset,
    components: components.recordset,
    quotes: quotes.recordset,
    payments: payments.recordset,
  };
}

/**
 * Tạo phiếu tiếp nhận sửa chữa. Nếu không truyền deviceId, tạo thiết bị mới
 * cho khách hàng — cả hai thao tác nằm trong 1 transaction.
 */
/**
 * Tiếp nhận khách vãng lai (chưa có hồ sơ sẵn): không phải khách nào cũng
 * quen thuộc/đã có trong hệ thống, nên kỹ thuật viên có thể gõ tay tên
 * (và SĐT nếu có) ngay lúc tiếp nhận máy thay vì bắt buộc phải chọn từ
 * danh sách khách hàng có sẵn.
 * - Nếu có SĐT và đã tồn tại khách trùng SĐT → dùng lại khách đó (tránh tạo
 *   trùng hồ sơ cho cùng 1 người).
 * - Ngược lại → tạo khách hàng mới (CustomerCode tự sinh, giống mọi khách
 *   hàng khác) rồi dùng CustomerID đó cho phiếu sửa chữa.
 */
async function resolveWalkInCustomerId({ customerName, customerPhone }) {
  if (customerPhone && customerPhone.trim()) {
    const existing = await customerService.findByPhone(customerPhone.trim());
    if (existing) return existing.CustomerID;
  }
  const newCustomerId = await customerService.createCustomer({
    fullName: customerName.trim(),
    phone: customerPhone ? customerPhone.trim() : undefined,
  });
  return newCustomerId;
}

async function createRepairOrder({
  customerId, customerName, customerPhone, deviceId, device, expectedDate,
  initialCondition, reportedIssue, accessories, imageUrl, note, createdBy,
}) {
  // Xác định CustomerID trước khi mở transaction tạo phiếu: nếu là khách
  // vãng lai thì tạo/tìm khách hàng trước (thao tác độc lập, không cần nằm
  // trong cùng transaction với việc tạo phiếu sửa chữa).
  let finalCustomerId = customerId;
  if (!finalCustomerId) {
    if (!customerName || !customerName.trim()) {
      throw new ApiError(400, 'Phải chọn khách hàng có sẵn hoặc nhập tên khách hàng mới');
    }
    finalCustomerId = await resolveWalkInCustomerId({ customerName, customerPhone });
  }

  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    let finalDeviceId = deviceId;
    if (!finalDeviceId) {
      if (!device || !device.deviceType) {
        throw new ApiError(400, 'Phải cung cấp deviceId hoặc thông tin thiết bị mới (device.deviceType là bắt buộc)');
      }
      finalDeviceId = await deviceService.createDeviceInRequest(new sql.Request(transaction), {
        customerId: finalCustomerId, ...device,
      });
    }

    const code = generateCode('RO');
    const result = await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), code)
      .input('customerId', sql.Int, finalCustomerId)
      .input('deviceId', sql.Int, finalDeviceId)
      .input('expectedDate', sql.DateTime2, expectedDate || null)
      .input('initialCondition', sql.NVarChar(500), initialCondition || null)
      .input('reportedIssue', sql.NVarChar(500), reportedIssue || null)
      .input('accessories', sql.NVarChar(255), accessories || null)
      .input('imageUrl', sql.NVarChar(500), imageUrl || null)
      .input('note', sql.NVarChar(500), note || null)
      .input('createdBy', sql.Int, createdBy)
      .query(`
        INSERT INTO RepairOrders
          (RepairOrderCode, CustomerID, DeviceID, ExpectedDate,
           InitialCondition, ReportedIssue, Accessories, ImageURL, Status, Note, CreatedBy)
        OUTPUT INSERTED.RepairOrderID
        VALUES
          (@code, @customerId, @deviceId, @expectedDate,
           @initialCondition, @reportedIssue, @accessories, @imageUrl, N'Tiếp nhận', @note, @createdBy)
      `);

    await transaction.commit();
    return { repairOrderId: result.recordset[0].RepairOrderID, repairOrderCode: code };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

async function updateStatus(repairOrderId, status, warrantyMonths) {
  if (!VALID_STATUSES.includes(status)) {
    throw new ApiError(400, `Trạng thái không hợp lệ: ${status}`);
  }
  const pool = await getPool();

  // Khi giao máy cho khách, ghi nhận thời điểm hoàn thành + số tháng bảo hành
  // (nếu có) và tính sẵn ngày hết hạn bảo hành = thời điểm giao + số tháng.
  if (status === 'Đã giao khách') {
    const months = Math.max(0, Number(warrantyMonths) || 0);
    await pool
      .request()
      .input('id', sql.Int, repairOrderId)
      .input('status', sql.NVarChar(30), status)
      .input('warrantyMonths', sql.Int, months)
      .query(`
        UPDATE RepairOrders
        SET Status = @status,
            CompletedDate = SYSDATETIME(),
            WarrantyMonths = @warrantyMonths,
            WarrantyExpiry = CASE WHEN @warrantyMonths > 0 THEN DATEADD(MONTH, @warrantyMonths, SYSDATETIME()) ELSE NULL END
        WHERE RepairOrderID = @id
      `);
    return;
  }

  await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .input('status', sql.NVarChar(30), status)
    .query(`UPDATE RepairOrders SET Status = @status WHERE RepairOrderID = @id`);
}

// ---------------------------------------------------------------------------
// Báo giá (Price Quotes) — mục 12
// ---------------------------------------------------------------------------

/**
 * Tạo báo giá: công sửa chữa + linh kiện dự kiến sử dụng.
 * Không trừ tồn kho ở bước này — chỉ trừ khi kỹ thuật viên THỰC SỰ dùng linh kiện
 * (xem useComponent bên dưới), đúng mục 12 & 13: báo giá là dự kiến, dùng thực tế là hành động riêng.
 */
async function createPriceQuote({ repairOrderId, items, discountAmount = 0 }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const laborCost = items.filter((i) => i.itemType === 'SERVICE').reduce((s, i) => s + i.quantity * i.unitPrice, 0);
    const componentCost = items.filter((i) => i.itemType === 'PRODUCT').reduce((s, i) => s + i.quantity * i.unitPrice, 0);

    const quoteResult = await new sql.Request(transaction)
      .input('repairOrderId', sql.Int, repairOrderId)
      .input('laborCost', sql.Decimal(18, 2), laborCost)
      .input('componentCost', sql.Decimal(18, 2), componentCost)
      .input('discountAmount', sql.Decimal(18, 2), discountAmount)
      .query(`
        INSERT INTO PriceQuotes (RepairOrderID, LaborCost, ComponentCost, DiscountAmount, CustomerDecision)
        OUTPUT INSERTED.PriceQuoteID
        VALUES (@repairOrderId, @laborCost, @componentCost, @discountAmount, 'PENDING')
      `);
    const priceQuoteId = quoteResult.recordset[0].PriceQuoteID;

    for (const item of items) {
      await new sql.Request(transaction)
        .input('priceQuoteId', sql.Int, priceQuoteId)
        .input('itemType', sql.NVarChar(20), item.itemType)
        .input('itemId', sql.Int, item.itemId)
        .input('quantity', sql.Int, item.quantity)
        .input('unitPrice', sql.Decimal(18, 2), item.unitPrice)
        .query(`
          INSERT INTO PriceQuoteDetails (PriceQuoteID, ItemType, ItemID, Quantity, UnitPrice)
          VALUES (@priceQuoteId, @itemType, @itemId, @quantity, @unitPrice)
        `);
    }

    // Lập báo giá không còn đổi trạng thái phiếu (đã bỏ trạng thái "Chờ khách xác nhận").

    await transaction.commit();
    return { priceQuoteId };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Khách hàng đồng ý / từ chối báo giá (mục 12).
 * Đồng ý -> "Đang sửa" · Từ chối -> giữ nguyên trạng thái phiếu.
 */
async function decidePriceQuote(priceQuoteId, decision) {
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
    throw new ApiError(400, 'Quyết định phải là ACCEPTED hoặc REJECTED');
  }
  const pool = await getPool();

  const quoteResult = await pool
    .request()
    .input('id', sql.Int, priceQuoteId)
    .query('SELECT RepairOrderID FROM PriceQuotes WHERE PriceQuoteID = @id');
  if (quoteResult.recordset.length === 0) throw new ApiError(404, 'Không tìm thấy báo giá');
  const { RepairOrderID } = quoteResult.recordset[0];

  await pool
    .request()
    .input('id', sql.Int, priceQuoteId)
    .input('decision', sql.NVarChar(20), decision)
    .query('UPDATE PriceQuotes SET CustomerDecision = @decision, DecisionDate = SYSDATETIME() WHERE PriceQuoteID = @id');

  let newStatus = null;
  if (decision === 'ACCEPTED') {
    newStatus = 'Đang sửa';
    await pool
      .request()
      .input('id', sql.Int, RepairOrderID)
      .input('status', sql.NVarChar(30), newStatus)
      .query('UPDATE RepairOrders SET Status = @status WHERE RepairOrderID = @id');
  }

  return { repairOrderId: RepairOrderID, newStatus };
}

// ---------------------------------------------------------------------------
// Công sửa chữa áp dụng thực tế (RepairOrderDetails)
// ---------------------------------------------------------------------------

async function addRepairService({ repairOrderId, repairServiceId, quantity, unitPrice }) {
  const pool = await getPool();
  await pool
    .request()
    .input('repairOrderId', sql.Int, repairOrderId)
    .input('repairServiceId', sql.Int, repairServiceId)
    .input('quantity', sql.Int, quantity)
    .input('unitPrice', sql.Decimal(18, 2), unitPrice)
    .query(`
      INSERT INTO RepairOrderDetails (RepairOrderID, RepairServiceID, Quantity, UnitPrice)
      VALUES (@repairOrderId, @repairServiceId, @quantity, @unitPrice)
    `);
}

async function removeRepairService(repairOrderDetailId) {
  const pool = await getPool();
  await pool.request().input('id', sql.Int, repairOrderDetailId).query('DELETE FROM RepairOrderDetails WHERE RepairOrderDetailID = @id');
}

// ---------------------------------------------------------------------------
// Linh kiện sử dụng thực tế (RepairComponents) — mục 13, TRỪ/HOÀN kho có transaction
// ---------------------------------------------------------------------------

/**
 * Dùng sản phẩm/linh kiện thực tế cho phiếu sửa chữa: trừ tồn kho Products
 * (chặn âm kho), ghi RepairComponents, ghi InventoryTransactions type REPAIR_USE.
 * (Products là danh mục ĐÃ GỘP Sản phẩm + Linh kiện thành 1 — xem migration 006.)
 */
async function useComponent({ repairOrderId, componentId, quantity, unitPrice, performedBy }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const updateResult = await new sql.Request(transaction)
      .input('componentId', sql.Int, componentId)
      .input('quantity', sql.Int, quantity)
      .query(`
        UPDATE Products
        SET Quantity = Quantity - @quantity, UpdatedAt = SYSDATETIME()
        WHERE ProductID = @componentId AND Quantity >= @quantity
      `);

    if (updateResult.rowsAffected[0] === 0) {
      const checkResult = await new sql.Request(transaction)
        .input('componentId', sql.Int, componentId)
        .query('SELECT ProductName, Quantity FROM Products WHERE ProductID = @componentId');
      if (checkResult.recordset.length === 0) throw new ApiError(404, `Không tìm thấy sản phẩm với ID ${componentId}`);
      const { ProductName, Quantity } = checkResult.recordset[0];
      throw new ApiError(400, `Sản phẩm "${ProductName}" không đủ tồn kho. Hiện còn ${Quantity}, yêu cầu dùng ${quantity}`);
    }

    const rcResult = await new sql.Request(transaction)
      .input('repairOrderId', sql.Int, repairOrderId)
      .input('componentId', sql.Int, componentId)
      .input('quantity', sql.Int, quantity)
      .input('unitPrice', sql.Decimal(18, 2), unitPrice)
      .query(`
        INSERT INTO RepairComponents (RepairOrderID, ComponentID, Quantity, UnitPrice)
        OUTPUT INSERTED.RepairComponentID
        VALUES (@repairOrderId, @componentId, @quantity, @unitPrice)
      `);

    const txCode = generateCode('TX');
    await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), txCode)
      .input('componentId', sql.Int, componentId)
      .input('quantity', sql.Int, quantity)
      .input('performedBy', sql.Int, performedBy)
      .input('referenceId', sql.Int, repairOrderId)
      .query(`
        INSERT INTO InventoryTransactions
          (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason)
        VALUES
          (@code, 'REPAIR_USE', 'PRODUCT', @componentId, @quantity, @performedBy, 'REPAIR_ORDER', @referenceId, N'Dùng sản phẩm/linh kiện cho phiếu sửa chữa')
      `);

    await transaction.commit();
    return { repairComponentId: rcResult.recordset[0].RepairComponentID };
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

/**
 * Hoàn kho sản phẩm/linh kiện (phiếu bị hủy hoặc không dùng nữa) — mục 13.
 * Cộng lại tồn kho Products, đánh dấu IsReturned = 1, ghi InventoryTransactions type REPAIR_RETURN.
 */
async function returnComponent({ repairComponentId, performedBy }) {
  const pool = await getPool();
  const transaction = new sql.Transaction(pool);

  try {
    await transaction.begin();

    const rcResult = await new sql.Request(transaction)
      .input('id', sql.Int, repairComponentId)
      .query('SELECT ComponentID, Quantity, IsReturned FROM RepairComponents WHERE RepairComponentID = @id');

    if (rcResult.recordset.length === 0) throw new ApiError(404, 'Không tìm thấy dòng sản phẩm/linh kiện sử dụng');
    const { ComponentID, Quantity, IsReturned } = rcResult.recordset[0];
    if (IsReturned) throw new ApiError(400, 'Dòng này đã được hoàn kho trước đó');

    await new sql.Request(transaction)
      .input('componentId', sql.Int, ComponentID)
      .input('quantity', sql.Int, Quantity)
      .query('UPDATE Products SET Quantity = Quantity + @quantity, UpdatedAt = SYSDATETIME() WHERE ProductID = @componentId');

    await new sql.Request(transaction)
      .input('id', sql.Int, repairComponentId)
      .query('UPDATE RepairComponents SET IsReturned = 1 WHERE RepairComponentID = @id');

    const txCode = generateCode('TX');
    await new sql.Request(transaction)
      .input('code', sql.NVarChar(30), txCode)
      .input('componentId', sql.Int, ComponentID)
      .input('quantity', sql.Int, Quantity)
      .input('performedBy', sql.Int, performedBy)
      .query(`
        INSERT INTO InventoryTransactions
          (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, Reason)
        VALUES
          (@code, 'REPAIR_RETURN', 'PRODUCT', @componentId, @quantity, @performedBy, N'Hoàn kho từ phiếu sửa chữa bị hủy/không dùng')
      `);

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Thanh toán sửa chữa
// ---------------------------------------------------------------------------

async function addPayment({ repairOrderId, amount, paymentMethod, note }) {
  const pool = await getPool();

  // Tính tổng chi phí (công + linh kiện chưa hoàn) và đã thanh toán để chặn
  // trả vượt quá công nợ còn lại — tránh nhập nhầm số tiền.
  const totalsResult = await pool
    .request()
    .input('id', sql.Int, repairOrderId)
    .query(`
      SELECT
        ISNULL((SELECT SUM(LineTotal) FROM RepairOrderDetails WHERE RepairOrderID = @id), 0)
          + ISNULL((SELECT SUM(LineTotal) FROM RepairComponents WHERE RepairOrderID = @id AND IsReturned = 0), 0) AS TotalCost,
        ISNULL((SELECT SUM(Amount) FROM Payments WHERE ReferenceType = 'REPAIR_ORDER' AND ReferenceID = @id), 0) AS PaidAmount
    `);
  const { TotalCost, PaidAmount } = totalsResult.recordset[0];
  const remaining = Number(TotalCost) - Number(PaidAmount);

  if (Number(amount) > remaining) {
    throw new ApiError(400, `Số tiền vượt quá công nợ còn lại (còn nợ ${remaining.toLocaleString('vi-VN')} đ)`);
  }

  await pool
    .request()
    .input('referenceId', sql.Int, repairOrderId)
    .input('amount', sql.Decimal(18, 2), amount)
    .input('paymentMethod', sql.NVarChar(20), paymentMethod)
    .input('note', sql.NVarChar(255), note || null)
    .query(`
      INSERT INTO Payments (ReferenceType, ReferenceID, Amount, PaymentMethod, Note)
      VALUES ('REPAIR_ORDER', @referenceId, @amount, @paymentMethod, @note)
    `);
}

module.exports = {
  VALID_STATUSES,
  listRepairOrders,
  findById,
  createRepairOrder,
  updateStatus,
  createPriceQuote,
  decidePriceQuote,
  addRepairService,
  removeRepairService,
  useComponent,
  returnComponent,
  addPayment,
};
