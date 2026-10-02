/**
 * Cài đặt cửa hàng — xem: mọi role đăng nhập (để hiển thị trên hóa đơn khi in);
 * sửa: chỉ ADMIN.
 */
const express = require('express');
const controller = require('../controllers/storeSettings.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateStoreSettings } = require('../validators/storeSettings.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.getStoreSettings);
router.put('/', authorize('ADMIN'), validateStoreSettings, controller.updateStoreSettings);

module.exports = router;
