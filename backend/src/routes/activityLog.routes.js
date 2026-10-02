/**
 * Nhật ký hệ thống — chỉ ADMIN được xem (mục 22 & 17 tài liệu dự án).
 */
const express = require('express');
const activityLogController = require('../controllers/activityLog.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');

const router = express.Router();

router.get('/', authenticate, authorize('ADMIN'), activityLogController.getActivityLogs);

module.exports = router;
