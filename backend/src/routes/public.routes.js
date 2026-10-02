/**
 * Route CÔNG KHAI — không qua middleware authenticate/authorize, vì mục
 * đích là để khách hàng bất kỳ (không có tài khoản) quét mã QR dán trên
 * sản phẩm/xe bằng điện thoại và xem được thông tin ngay.
 * Chỉ trả về dữ liệu an toàn để công khai — xem controller.
 * Vẫn được áp dụng apiLimiter chung (giới hạn tốc độ request) ở server.js.
 */
const express = require('express');
const publicController = require('../controllers/public.controller');

const router = express.Router();

router.get('/products/:code', publicController.getPublicProduct);
router.get('/components/:code', publicController.getPublicComponent);

module.exports = router;
