/**
 * Đối chiếu hàng nhập bằng ảnh hóa đơn theo ngày — thay cho module Nhập
 * hàng/Nhà cung cấp cũ. Đặt trong Kho hàng ở frontend.
 */
const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const invoicePhotoController = require('../controllers/invoicePhoto.controller');

const router = express.Router();

router.use(authenticate);

router.get('/', invoicePhotoController.getPhotosByDate);
router.get('/summary', invoicePhotoController.getDatesSummary);
router.post('/', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), invoicePhotoController.createPhoto);
router.delete('/:id', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), invoicePhotoController.deletePhoto);

module.exports = router;
