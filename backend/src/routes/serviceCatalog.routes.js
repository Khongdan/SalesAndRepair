/**
 * Bảng giá công sửa chữa — xem: mọi role; tạo/sửa/xóa: ADMIN, MANAGER.
 */
const express = require('express');
const controller = require('../controllers/serviceCatalog.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateService } = require('../validators/serviceCatalog.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', controller.getServices);
router.post('/', authorize('ADMIN', 'MANAGER'), validateService, controller.createService);
router.put('/:id', authorize('ADMIN', 'MANAGER'), validateService, controller.updateService);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), controller.deleteService);

module.exports = router;
