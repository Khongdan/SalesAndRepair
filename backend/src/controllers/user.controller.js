const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const userService = require('../services/user.service');
const { hashPassword } = require('../services/auth.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * GET /api/users?page=1&pageSize=20
 * Chỉ ADMIN mới được xem danh sách người dùng (áp dụng ở route qua middleware authorize).
 */
const getUsers = asyncHandler(async (req, res) => {
  const page = Number(req.query.page) || 1;
  const pageSize = Math.min(Number(req.query.pageSize) || 20, 100);
  const result = await userService.listUsers({ page, pageSize });
  return success(res, result, 'Lấy danh sách người dùng thành công');
});

const getUserById = asyncHandler(async (req, res) => {
  const user = await userService.findById(Number(req.params.id));
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  return success(res, user, 'Lấy thông tin người dùng thành công');
});

/**
 * POST /api/users
 * Tạo user mới — mật khẩu được hash bằng bcrypt trước khi lưu, không bao giờ lưu plaintext.
 */
const createUser = asyncHandler(async (req, res) => {
  const { username, password, fullName, email, phone, roleId } = req.body;

  const existing = await userService.findByUsername(username);
  if (existing) throw new ApiError(409, 'Username đã tồn tại');

  const passwordHash = await hashPassword(password);
  const userId = await userService.createUser({ username, passwordHash, fullName, email, phone, roleId });

  const created = await userService.findById(userId);
  logActivity({ userId: req.user.userId, action: 'CREATE_USER', targetTable: 'Users', targetId: userId, description: `Tạo người dùng ${created.Username} — vai trò ${created.RoleName}` });
  return success(res, created, 'Tạo người dùng thành công', 201);
});

const updateUser = asyncHandler(async (req, res) => {
  const userId = Number(req.params.id);
  const existing = await userService.findById(userId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy người dùng');

  const { fullName, email, phone, roleId, status } = req.body;
  await userService.updateUser(userId, { fullName, email, phone, roleId, status: status || existing.Status });

  const updated = await userService.findById(userId);
  const roleChanged = existing.RoleID !== updated.RoleID;
  logActivity({ userId: req.user.userId, action: roleChanged ? 'CHANGE_USER_ROLE' : 'UPDATE_USER', targetTable: 'Users', targetId: userId, description: roleChanged ? `Đổi vai trò ${updated.Username}: ${existing.RoleName} → ${updated.RoleName}` : `Sửa thông tin người dùng ${updated.Username}` });
  return success(res, updated, 'Cập nhật người dùng thành công');
});

module.exports = { getUsers, getUserById, createUser, updateUser };
