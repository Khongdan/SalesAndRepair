/**
 * Bán hàng — xem: mọi role đăng nhập; tạo đơn (checkout POS): ADMIN, MANAGER, CASHIER.
 */
const express = require('express');
const salesOrderController = require('../controllers/salesOrder.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateCreateSalesOrder, validateSalesPayment } = require('../validators/salesOrder.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', salesOrderController.getSalesOrders);
router.get('/:id', salesOrderController.getSalesOrderById);
router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateCreateSalesOrder, salesOrderController.createSalesOrder);
router.post('/:id/payment', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateSalesPayment, salesOrderController.addPayment);

module.exports = router;
