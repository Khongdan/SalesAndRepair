/**
 * Khách hàng — xem: mọi role đăng nhập (CASHIER cần xem khi bán hàng);
 * tạo/sửa/xóa: ADMIN, MANAGER, CASHIER (CASHIER được tạo khách hàng mới khi bán hàng, mục 17).
 */
const express = require('express');
const customerController = require('../controllers/customer.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateCustomer } = require('../validators/customer.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.get('/:id/history', customerController.getCustomerHistory);
router.post('/', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateCustomer, customerController.createCustomer);
router.put('/:id', authorize('ADMIN', 'MANAGER', 'CASHIER'), validateCustomer, customerController.updateCustomer);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), customerController.deleteCustomer);

module.exports = router;
