/**
 * Middleware xác thực JWT.
 * Kiểm tra header Authorization: Bearer <token>, giải mã và gắn req.user.
 * Không tin tưởng bất kỳ thông tin quyền nào gửi từ client ngoài token đã ký.
 */
const { verifyToken } = require('../services/auth.service');
const ApiError = require('../utils/apiError');

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Thiếu hoặc sai định dạng token xác thực'));
  }

  try {
    const payload = verifyToken(token);
    // payload: { userId, username, roleId, roleName }
    req.user = payload;
    next();
  } catch (err) {
    return next(new ApiError(401, 'Token không hợp lệ hoặc đã hết hạn'));
  }
}

module.exports = authenticate;
