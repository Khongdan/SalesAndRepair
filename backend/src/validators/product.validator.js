const ApiError = require('../utils/apiError');

function validateCreateProduct(req, res, next) {
  // Lưu ý: KHÔNG validate productCode nữa — mã sản phẩm do hệ thống tự sinh
  // (xem product.service.js#generateProductCode), người dùng không tự nhập.
  const { productName, importPrice, salePrice, quantity, minStock } = req.body;
  const errors = [];
  if (!productName || !productName.trim()) errors.push('Tên sản phẩm là bắt buộc');
  if (importPrice !== undefined && Number(importPrice) < 0) errors.push('Giá nhập không được âm');
  if (salePrice !== undefined && Number(salePrice) < 0) errors.push('Giá bán không được âm');
  if (quantity !== undefined && Number(quantity) < 0) errors.push('Số lượng tồn không được âm');
  if (minStock !== undefined && Number(minStock) < 0) errors.push('Mức tồn tối thiểu không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateUpdateProduct(req, res, next) {
  const { productName, importPrice, salePrice, minStock } = req.body;
  const errors = [];
  if (!productName || !productName.trim()) errors.push('Tên sản phẩm là bắt buộc');
  if (importPrice !== undefined && Number(importPrice) < 0) errors.push('Giá nhập không được âm');
  if (salePrice !== undefined && Number(salePrice) < 0) errors.push('Giá bán không được âm');
  if (minStock !== undefined && Number(minStock) < 0) errors.push('Mức tồn tối thiểu không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateCreateProduct, validateUpdateProduct };
