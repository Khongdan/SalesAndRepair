/**
 * Báo cáo & Dashboard — xem: ADMIN, MANAGER (đúng mục 17: MANAGER quản lý báo cáo).
 * Dashboard tổng quan (/dashboard) mở cho mọi role đăng nhập vì ai cũng cần thấy
 * tình hình chung khi vào trang chủ.
 */
const express = require('express');
const reportController = require('../controllers/report.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');

const router = express.Router();

router.use(authenticate);

router.get('/dashboard', reportController.getDashboard);

router.use(authorize('ADMIN', 'MANAGER'));
router.get('/revenue', reportController.getRevenueReport);
router.get('/profit', reportController.getProfitReport);
router.get('/top-products', reportController.getTopProducts);
router.get('/top-components', reportController.getTopComponents);
router.get('/inventory', reportController.getInventoryReport);
router.get('/import-export', reportController.getImportExportReport);
router.get('/revenue-summary', reportController.getRevenueSummary);
router.get('/debt', reportController.getDebtReport);
router.get('/export/xlsx', reportController.exportReportsXlsx);

module.exports = router;
