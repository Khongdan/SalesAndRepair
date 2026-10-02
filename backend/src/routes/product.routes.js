/**
 * Sản phẩm — xem: mọi role đăng nhập; tạo/sửa/xóa: ADMIN, MANAGER, WAREHOUSE
 * (theo bảng phân quyền mục 17: WAREHOUSE quản lý nhập/xuất/kiểm kê, cần sửa thông tin sản phẩm).
 */
const express = require('express');
const productController = require('../controllers/product.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateCreateProduct, validateUpdateProduct } = require('../validators/product.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', productController.getProducts);
router.get('/low-stock', productController.getLowStockProducts);
router.get('/:id', productController.getProductById);
router.post('/', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), validateCreateProduct, productController.createProduct);
router.put('/:id', authorize('ADMIN', 'MANAGER', 'WAREHOUSE'), validateUpdateProduct, productController.updateProduct);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), productController.deleteProduct);

module.exports = router;
