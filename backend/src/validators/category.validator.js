const ApiError = require('../utils/apiError');

function validateCategory(req, res, next) {
  const { categoryName } = req.body;
  const errors = [];
  if (!categoryName || !categoryName.trim()) errors.push('Tên danh mục là bắt buộc');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateCategory };
