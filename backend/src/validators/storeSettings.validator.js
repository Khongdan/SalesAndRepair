const ApiError = require('../utils/apiError');

function validateStoreSettings(req, res, next) {
  const { storeName, email } = req.body;
  const errors = [];
  if (!storeName || !storeName.trim()) errors.push('Tên cửa hàng là bắt buộc');
  if (email && !/^\S+@\S+\.\S+$/.test(email)) errors.push('Email không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateStoreSettings };
