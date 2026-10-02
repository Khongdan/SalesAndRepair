/**
 * Quản lý người dùng — chỉ ADMIN được tạo/sửa/xem danh sách toàn bộ user,
 * theo đúng bảng phân quyền ở mục 17 tài liệu dự án.
 */
const express = require('express');
const userController = require('../controllers/user.controller');
const authenticate = require('../middleware/auth.middleware');
const authorize = require('../middleware/rbac.middleware');
const { validateCreateUser, validateUpdateUser } = require('../validators/user.validator');

const router = express.Router();

router.use(authenticate);

router.get('/', authorize('ADMIN'), userController.getUsers);
router.get('/:id', authorize('ADMIN'), userController.getUserById);
router.post('/', authorize('ADMIN'), validateCreateUser, userController.createUser);
router.put('/:id', authorize('ADMIN'), validateUpdateUser, userController.updateUser);

module.exports = router;
