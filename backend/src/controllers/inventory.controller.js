const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');
const inventoryService = require('../services/inventory.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * POST /api/inventory/import
 * Nhập kho thủ công (ngoài luồng Purchase Order — vd: hàng trả lại từ khách,
 * hàng khuyến mãi...). Luồng nhập theo phiếu nhập chính thức nằm ở module Purchases (Giai đoạn 5).
 */
const importStock = asyncHandler(async (req, res) => {
  const { itemType, itemId, quantity, reason, note } = req.body;
  const result = await inventoryService.increaseStock({
    itemType,
    itemId: Number(itemId),
    quantity: Number(quantity),
    performedBy: req.user.userId,
    transactionType: 'IMPORT',
    reason,
    note,
  });
  logActivity({ userId: req.user.userId, action: 'IMPORT_STOCK', targetTable: 'Products', targetId: Number(itemId), description: `Nhập kho ${quantity} — lý do: ${reason || 'không ghi'}` });
  return success(res, result, 'Nhập kho thành công', 201);
});

/**
 * POST /api/inventory/export
 * Xuất kho thủ công (vd: hàng hỏng, hàng trả nhà cung cấp...).
 */
const exportStock = asyncHandler(async (req, res) => {
  const { itemType, itemId, quantity, reason, note } = req.body;
  const result = await inventoryService.decreaseStock({
    itemType,
    itemId: Number(itemId),
    quantity: Number(quantity),
    performedBy: req.user.userId,
    transactionType: 'EXPORT',
    reason,
    note,
  });
  logActivity({ userId: req.user.userId, action: 'EXPORT_STOCK', targetTable: 'Products', targetId: Number(itemId), description: `Xuất kho ${quantity} — lý do: ${reason || 'không ghi'}` });
  return success(res, result, 'Xuất kho thành công', 201);
});

/**
 * POST /api/inventory/adjust
 * Điều chỉnh tồn kho sau khi kiểm kê thực tế.
 */
const adjustStock = asyncHandler(async (req, res) => {
  const { itemType, itemId, newQuantity, reason, note } = req.body;
  const result = await inventoryService.adjustStock({
    itemType,
    itemId: Number(itemId),
    newQuantity: Number(newQuantity),
    performedBy: req.user.userId,
    reason,
    note,
  });
  logActivity({ userId: req.user.userId, action: 'ADJUST_STOCK', targetTable: 'Products', targetId: Number(itemId), description: `Điều chỉnh tồn kho thành ${newQuantity} — lý do: ${reason || 'không ghi'}` });
  return success(res, result, 'Điều chỉnh tồn kho thành công');
});

const getTransactions = asyncHandler(async (req, res) => {
  const { page, pageSize, itemType, itemId, transactionType } = req.query;
  const result = await inventoryService.listTransactions({
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
    itemType,
    itemId: itemId ? Number(itemId) : undefined,
    transactionType,
  });
  return success(res, result, 'Lấy lịch sử giao dịch kho thành công');
});

const getLowStock = asyncHandler(async (req, res) => {
  const items = await inventoryService.getLowStockSummary();
  return success(res, items, 'Lấy danh sách hàng sắp hết thành công');
});

module.exports = { importStock, exportStock, adjustStock, getTransactions, getLowStock };
