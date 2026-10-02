/**
 * Sửa chữa — module quan trọng nhất bên cạnh Bán hàng.
 * Phân quyền theo mục 17 tài liệu dự án:
 * - Xem: mọi role đăng nhập.
 * - Tiếp nhận/tạo phiếu, phân công KTV, báo giá: ADMIN, MANAGER, CASHIER (lễ tân tiếp nhận máy).
 * - Cập nhật trạng thái, dùng linh kiện, thêm công sửa chữa: ADMIN, MANAGER, TECHNICIAN
 *   (TECHNICIAN chỉ thao tác trên phiếu — kiểm tra "được giao cho mình" có thể bổ sung ở Giai đoạn sau
 *   nếu cần chặt chẽ hơn; hiện tại TECHNICIAN được thao tác mọi phiếu để đơn giản cho dự án sinh viên).
 * - Hoàn kho linh kiện, xóa công sửa chữa: ADMIN, MANAGER, WAREHOUSE, TECHNICIAN.
 */
const express = require('express');
const repairOrderController = require('../controllers/repairOrder.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const {
  validateCreateRepairOrder,
  validateUpdateStatus,
  validateCreatePriceQuote,
  validateQuoteDecision,
  validateAddService,
  validateUseComponent,
  validatePayment,
} = require('../validators/repairOrder.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', repairOrderController.getRepairOrders);
router.get('/:id', repairOrderController.getRepairOrderById);

router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateCreateRepairOrder, repairOrderController.createRepairOrder);
router.put('/:id/status', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), validateUpdateStatus, repairOrderController.updateStatus);

router.post('/:id/quote', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), validateCreatePriceQuote, repairOrderController.createPriceQuote);
router.put('/:id/quote/:quoteId/decision', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateQuoteDecision, repairOrderController.decidePriceQuote);

router.post('/:id/services', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), validateAddService, repairOrderController.addService);
router.delete('/:id/services/:detailId', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), repairOrderController.removeService);

router.post('/:id/components', authorize('ADMIN', 'MANAGER', 'TECHNICIAN'), validateUseComponent, repairOrderController.useComponent);
router.delete('/:id/components/:repairComponentId', authorize('ADMIN', 'MANAGER', 'TECHNICIAN', 'WAREHOUSE'), repairOrderController.returnComponent);

router.post('/:id/payment', authorize('ADMIN', 'MANAGER', 'CASHIER'), validatePayment, repairOrderController.addPayment);

module.exports = router;
