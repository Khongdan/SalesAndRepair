/**
 * Danh mục sản phẩm — mọi role đăng nhập đều xem được, chỉ ADMIN/MANAGER được sửa.
 */
const express = require('express');
const categoryController = require('../controllers/category.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateCategory } = require('../validators/category.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', categoryController.getCategories);
router.post('/', authorize('ADMIN', 'MANAGER'), validateCategory, categoryController.createCategory);
router.put('/:id', authorize('ADMIN', 'MANAGER'), validateCategory, categoryController.updateCategory);
router.delete('/:id', authorize('ADMIN', 'MANAGER'), categoryController.deleteCategory);

module.exports = router;
