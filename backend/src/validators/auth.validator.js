const ApiError = require('../utils/apiError');

function validateLogin(req, res, next) {
  const { username, password } = req.body;
  const errors = [];
  if (!username || typeof username !== 'string' || !username.trim()) {
    errors.push('Tên đăng nhập là bắt buộc');
  }
  if (!password || typeof password !== 'string' || password.length < 4) {
    errors.push('Mật khẩu là bắt buộc và phải có ít nhất 4 ký tự');
  }
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateChangePassword(req, res, next) {
  const { oldPassword, newPassword } = req.body;
  const errors = [];
  if (!oldPassword) errors.push('Mật khẩu cũ là bắt buộc');
  if (!newPassword || newPassword.length < 6) errors.push('Mật khẩu mới phải có ít nhất 6 ký tự');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateLogin, validateChangePassword };
