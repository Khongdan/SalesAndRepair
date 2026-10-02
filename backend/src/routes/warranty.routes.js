/**
 * Bảo hành — tra cứu nhanh theo SĐT/biển số-số khung + danh sách sắp hết hạn.
 * Mở cho mọi role đăng nhập (thu ngân/kỹ thuật viên đều cần tra khi khách mang
 * xe đến bảo hành lại), không giới hạn riêng ADMIN/MANAGER như trang Báo cáo.
 */
const express = require('express');
const warrantyController = require('../controllers/warranty.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.use(authenticate);
router.get('/search', warrantyController.searchWarranty);
router.get('/expiring', warrantyController.getExpiringWarranties);

module.exports = router;
