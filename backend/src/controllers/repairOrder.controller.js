const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const repairOrderService = require('../services/repairOrder.service');
const { logActivity } = require('../services/activityLog.service');

const getRepairOrders = asyncHandler(async (req, res) => {
  const { page, pageSize, status, customerId } = req.query;
  const result = await repairOrderService.listRepairOrders({
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
    status,
    customerId: customerId ? Number(customerId) : undefined,
  });
  return success(res, result, 'Lấy danh sách phiếu sửa chữa thành công');
});

const getRepairOrderById = asyncHandler(async (req, res) => {
  const order = await repairOrderService.findById(Number(req.params.id));
  if (!order) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');
  return success(res, order, 'Lấy chi tiết phiếu sửa chữa thành công');
});

const createRepairOrder = asyncHandler(async (req, res) => {
  const {
    customerId, customerName, customerPhone,
    deviceId, device, expectedDate, initialCondition, reportedIssue, accessories, imageUrl, note,
  } = req.body;
  const result = await repairOrderService.createRepairOrder({
    // Chỉ 1 trong 2 sẽ được dùng: nếu có customerId thì ưu tiên khách đã có
    // sẵn; nếu không, service sẽ tự tạo (hoặc tìm theo SĐT) khách vãng lai
    // từ customerName/customerPhone.
    customerId: customerId ? Number(customerId) : undefined,
    customerName,
    customerPhone,
    deviceId: deviceId ? Number(deviceId) : undefined,
    device,
    expectedDate,
    initialCondition,
    reportedIssue,
    accessories,
    imageUrl,
    note,
    createdBy: req.user.userId,
  });
  logActivity({ userId: req.user.userId, action: 'CREATE_REPAIR_ORDER', targetTable: 'RepairOrders', targetId: result.repairOrderId, description: `Tiếp nhận phiếu sửa chữa ${result.repairOrderCode}` });
  return success(res, result, 'Tiếp nhận phiếu sửa chữa thành công', 201);
});

const updateStatus = asyncHandler(async (req, res) => {
  const repairOrderId = Number(req.params.id);
  const existing = await repairOrderService.findById(repairOrderId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');

  await repairOrderService.updateStatus(repairOrderId, req.body.status, req.body.warrantyMonths);
  const updated = await repairOrderService.findById(repairOrderId);
  logActivity({ userId: req.user.userId, action: 'UPDATE_REPAIR_STATUS', targetTable: 'RepairOrders', targetId: repairOrderId, description: `Chuyển trạng thái phiếu ${existing.RepairOrderCode} sang "${req.body.status}"` });
  return success(res, updated, 'Cập nhật trạng thái thành công');
});

const createPriceQuote = asyncHandler(async (req, res) => {
  const repairOrderId = Number(req.params.id);
  const existing = await repairOrderService.findById(repairOrderId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');

  const result = await repairOrderService.createPriceQuote({
    repairOrderId,
    items: req.body.items,
    discountAmount: Number(req.body.discountAmount) || 0,
  });
  return success(res, result, 'Tạo báo giá thành công', 201);
});

const decidePriceQuote = asyncHandler(async (req, res) => {
  const result = await repairOrderService.decidePriceQuote(Number(req.params.quoteId), req.body.decision);
  return success(res, result, 'Ghi nhận quyết định báo giá thành công');
});

const addService = asyncHandler(async (req, res) => {
  const repairOrderId = Number(req.params.id);
  const existing = await repairOrderService.findById(repairOrderId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');

  await repairOrderService.addRepairService({
    repairOrderId,
    repairServiceId: Number(req.body.repairServiceId),
    quantity: Number(req.body.quantity),
    unitPrice: Number(req.body.unitPrice),
  });
  const updated = await repairOrderService.findById(repairOrderId);
  return success(res, updated, 'Thêm công sửa chữa thành công', 201);
});

const removeService = asyncHandler(async (req, res) => {
  await repairOrderService.removeRepairService(Number(req.params.detailId));
  const updated = await repairOrderService.findById(Number(req.params.id));
  return success(res, updated, 'Xóa công sửa chữa thành công');
});

/**
 * Dùng linh kiện thực tế — trừ tồn kho (transaction, chặn âm kho).
 */
const useComponent = asyncHandler(async (req, res) => {
  const repairOrderId = Number(req.params.id);
  const existing = await repairOrderService.findById(repairOrderId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');

  await repairOrderService.useComponent({
    repairOrderId,
    componentId: Number(req.body.componentId),
    quantity: Number(req.body.quantity),
    unitPrice: Number(req.body.unitPrice),
    performedBy: req.user.userId,
  });
  const updated = await repairOrderService.findById(repairOrderId);
  logActivity({ userId: req.user.userId, action: 'USE_COMPONENT', targetTable: 'RepairOrders', targetId: repairOrderId, description: `Dùng linh kiện ID ${req.body.componentId} x${req.body.quantity} cho phiếu ${existing.RepairOrderCode}` });
  return success(res, updated, 'Ghi nhận dùng linh kiện thành công', 201);
});

/**
 * Hoàn kho linh kiện (phiếu bị hủy / linh kiện không dùng nữa).
 */
const returnComponent = asyncHandler(async (req, res) => {
  await repairOrderService.returnComponent({
    repairComponentId: Number(req.params.repairComponentId),
    performedBy: req.user.userId,
  });
  const updated = await repairOrderService.findById(Number(req.params.id));
  return success(res, updated, 'Hoàn kho linh kiện thành công');
});

const addPayment = asyncHandler(async (req, res) => {
  const repairOrderId = Number(req.params.id);
  const existing = await repairOrderService.findById(repairOrderId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy phiếu sửa chữa');

  await repairOrderService.addPayment({
    repairOrderId,
    amount: Number(req.body.amount),
    paymentMethod: req.body.paymentMethod,
    note: req.body.note,
  });
  const updated = await repairOrderService.findById(repairOrderId);
  return success(res, updated, 'Ghi nhận thanh toán thành công', 201);
});

module.exports = {
  getRepairOrders,
  getRepairOrderById,
  createRepairOrder,
  updateStatus,
  createPriceQuote,
  decidePriceQuote,
  addService,
  removeService,
  useComponent,
  returnComponent,
  addPayment,
};
