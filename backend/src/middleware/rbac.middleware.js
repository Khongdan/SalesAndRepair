/**
 * Middleware phân quyền theo Role (RBAC).
 * Dùng sau authenticate middleware — req.user.roleName lấy từ JWT đã xác thực,
 * KHÔNG BAO GIỜ tin dữ liệu quyền do frontend tự gửi lên.
 *
 * Cách dùng: router.post('/products', authenticate, authorize('ADMIN','MANAGER','WAREHOUSE'), handler)
 */
const ApiError = require('../utils/apiError');

function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new ApiError(401, 'Chưa xác thực'));
    }
    if (!allowedRoles.includes(req.user.roleName)) {
      return next(new ApiError(403, 'Bạn không có quyền thực hiện thao tác này'));
    }
    next();
  };
}

module.exports = authorize;
