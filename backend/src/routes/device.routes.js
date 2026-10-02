/**
 * Thiết bị — bản tối giản: chỉ GET theo customerId (dùng khi tạo phiếu sửa chữa
 * để chọn thiết bị đã từng sửa trước đó). Tạo thiết bị mới nằm trong luồng
 * tạo phiếu sửa chữa (POST /api/repairs), xem repairOrder.service.js.
 */
const express = require('express');
const deviceController = require('../controllers/device.controller');
const authenticate = require('../middleware/auth.middleware');

const router = express.Router();

router.get('/', authenticate, deviceController.getDevicesByCustomer);

module.exports = router;
