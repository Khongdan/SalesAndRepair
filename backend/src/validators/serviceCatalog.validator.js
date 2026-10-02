const ApiError = require('../utils/apiError');

function validateService(req, res, next) {
  const { serviceName, defaultPrice } = req.body;
  const errors = [];
  if (!serviceName || !serviceName.trim()) errors.push('Tên dịch vụ là bắt buộc');
  if (defaultPrice !== undefined && Number(defaultPrice) < 0) errors.push('Giá mặc định không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateService };
