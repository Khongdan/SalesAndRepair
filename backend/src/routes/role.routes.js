const express = require('express');
const roleController = require('../controllers/role.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');

const router = express.Router();

// ADMIN và MANAGER đều cần xem danh sách role (vd: để tạo/gán user)
router.get('/', authenticate, authorize('ADMIN', 'MANAGER'), roleController.getRoles);

module.exports = router;
