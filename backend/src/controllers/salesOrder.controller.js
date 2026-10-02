const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const salesOrderService = require('../services/salesOrder.service');
const { logActivity } = require('../services/activityLog.service');

const getSalesOrders = asyncHandler(async (req, res) => {
  const { page, pageSize, customerId, status } = req.query;
  const result = await salesOrderService.listSalesOrders({
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
    customerId: customerId ? Number(customerId) : undefined,
    status,
  });
  return success(res, result, 'Lấy danh sách đơn bán hàng thành công');
});

const getSalesOrderById = asyncHandler(async (req, res) => {
  const order = await salesOrderService.findById(Number(req.params.id));
  if (!order) throw new ApiError(404, 'Không tìm thấy đơn bán hàng');
  return success(res, order, 'Lấy chi tiết đơn bán hàng thành công');
});

/**
 * Checkout POS — trừ tồn kho + ghi lịch sử kho + ghi thanh toán,
 * toàn bộ trong 1 transaction (xử lý ở salesOrder.service.js).
 */
const createSalesOrder = asyncHandler(async (req, res) => {
  const { customerId, discountAmount, paymentMethod, paidAmount, items } = req.body;
  const result = await salesOrderService.createSalesOrder({
    customerId: customerId ? Number(customerId) : null,
    createdBy: req.user.userId,
    discountAmount: Number(discountAmount) || 0,
    paymentMethod,
    paidAmount: paidAmount === undefined || paidAmount === null ? undefined : Number(paidAmount),
    items: items.map((it) => ({
      productId: Number(it.productId),
      quantity: Number(it.quantity),
      unitPrice: Number(it.unitPrice),
      warrantyMonths: Number(it.warrantyMonths) || 0,
    })),
  });
  logActivity({ userId: req.user.userId, action: 'CREATE_SALES_ORDER', targetTable: 'SalesOrders', targetId: result.salesOrderId, description: `Tạo đơn bán hàng ${result.salesOrderCode} — thành tiền ${result.finalAmount}` });
  return success(res, result, 'Tạo đơn bán hàng thành công', 201);
});

/**
 * Ghi nhận thêm 1 lần thanh toán cho đơn đã tạo (khách trả công nợ dần).
 */
const addPayment = asyncHandler(async (req, res) => {
  const { amount, paymentMethod, note } = req.body;
  await salesOrderService.addPayment({
    salesOrderId: Number(req.params.id),
    amount: Number(amount),
    paymentMethod,
    note,
  });
  logActivity({ userId: req.user.userId, action: 'ADD_SALES_PAYMENT', targetTable: 'SalesOrders', targetId: Number(req.params.id), description: `Ghi nhận thanh toán ${amount} cho đơn bán hàng #${req.params.id}` });
  return success(res, {}, 'Ghi nhận thanh toán thành công');
});

module.exports = { getSalesOrders, getSalesOrderById, createSalesOrder, addPayment };
