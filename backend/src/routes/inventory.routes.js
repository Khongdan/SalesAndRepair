/**
 * Kho — import/export/adjust chỉ dành cho ADMIN, MANAGER, WAREHOUSE (đúng mục 17).
 * Xem lịch sử giao dịch và hàng sắp hết: mọi role đăng nhập.
 */
const express = require('express');
const inventoryController = require('../controllers/inventory.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateStockChange, validateAdjustStock } = require('../validators/inventory.validator');

const router = express.Router();

router.use(authenticate);

router.get('/transactions', inventoryController.getTransactions);
router.get('/low-stock', inventoryController.getLowStock);
router.post('/import', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), validateStockChange, inventoryController.importStock);
router.post('/export', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), validateStockChange, inventoryController.exportStock);
router.post('/adjust', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), validateAdjustStock, inventoryController.adjustStock);

module.exports = router;
