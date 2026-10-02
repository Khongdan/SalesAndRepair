const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const userService = require('../services/user.service');
const { comparePassword, signToken, hashPassword } = require('../services/auth.service');
const { logActivity } = require('../services/activityLog.service');

/**
 * POST /api/auth/login
 * Xác thực username/password, trả về JWT + thông tin user (không kèm PasswordHash).
 */
const login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  const user = await userService.findByUsername(username);
  if (!user) {
    throw new ApiError(401, 'Tên đăng nhập hoặc mật khẩu không đúng');
  }
  if (user.Status !== 'ACTIVE') {
    throw new ApiError(403, 'Tài khoản đã bị vô hiệu hóa');
  }

  const isMatch = await comparePassword(password, user.PasswordHash);
  if (!isMatch) {
    throw new ApiError(401, 'Tên đăng nhập hoặc mật khẩu không đúng');
  }

  const token = signToken({
    userId: user.UserID,
    username: user.Username,
    roleId: user.RoleID,
    roleName: user.RoleName,
  });

  logActivity({ userId: user.UserID, action: 'LOGIN', description: `Đăng nhập: ${user.Username}` });

  return success(res, {
    token,
    user: {
      userId: user.UserID,
      username: user.Username,
      fullName: user.FullName,
      email: user.Email,
      roleId: user.RoleID,
      roleName: user.RoleName,
    },
  }, 'Đăng nhập thành công');
});

/**
 * GET /api/auth/me
 * Trả thông tin user hiện tại dựa trên token đã xác thực (req.user do middleware gắn vào).
 */
const me = asyncHandler(async (req, res) => {
  const user = await userService.findById(req.user.userId);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');
  return success(res, user, 'Lấy thông tin người dùng thành công');
});

/**
 * POST /api/auth/change-password
 * Cho phép user tự đổi mật khẩu của chính mình.
 */
const changePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const user = await userService.findByUsername(req.user.username);
  if (!user) throw new ApiError(404, 'Không tìm thấy người dùng');

  const isMatch = await comparePassword(oldPassword, user.PasswordHash);
  if (!isMatch) throw new ApiError(400, 'Mật khẩu cũ không đúng');

  const newHash = await hashPassword(newPassword);
  await userService.updatePassword(user.UserID, newHash);

  return success(res, {}, 'Đổi mật khẩu thành công');
});

module.exports = { login, me, changePassword };
