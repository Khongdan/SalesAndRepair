const ApiError = require('../utils/apiError');

function validateCustomer(req, res, next) {
  const { fullName } = req.body;
  const errors = [];
  if (!fullName || !fullName.trim()) errors.push('Họ tên khách hàng là bắt buộc');
  if (req.body.email && !/^\S+@\S+\.\S+$/.test(req.body.email)) errors.push('Email không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateCustomer };
