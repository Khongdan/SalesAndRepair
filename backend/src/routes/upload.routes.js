/**
 * Upload ảnh — dùng chung cho form Thêm/Sửa Sản phẩm (đã gộp Linh kiện),
 * ảnh xe lúc tiếp nhận sửa chữa, ảnh QR thanh toán trong Cài đặt, và ảnh
 * hóa đơn nhập hàng (đối chiếu hàng nhập trong Kho hàng).
 * Chỉ cần đăng nhập là được upload; RBAC thật sự nằm ở bước tạo/sửa dữ liệu.
 */
const express = require('express');
const authenticate = require('../middleware/auth.middleware');
const { buildUploader } = require('../middleware/upload.middleware');
const uploadController = require('../controllers/upload.controller');

const router = express.Router();

router.use(authenticate);

router.post('/products/image', buildUploader('products'), uploadController.uploadProductImage);
router.post('/settings/image', buildUploader('settings'), uploadController.uploadSettingsImage);
router.post('/invoices/image', buildUploader('invoices'), uploadController.uploadInvoicePhoto);
router.post('/repairs/image', buildUploader('repairs'), uploadController.uploadRepairImage);

module.exports = router;
