const ApiError = require('../utils/apiError');

const VALID_ITEM_TYPES = ['PRODUCT']; // Components đã gộp vào Products

function validateStockChange(req, res, next) {
  const { itemType, itemId, quantity } = req.body;
  const errors = [];
  if (!VALID_ITEM_TYPES.includes(itemType)) errors.push('ItemType phải là PRODUCT');
  if (!itemId || Number.isNaN(Number(itemId))) errors.push('ItemID là bắt buộc và phải là số');
  if (!quantity || Number(quantity) <= 0) errors.push('Số lượng phải lớn hơn 0');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateAdjustStock(req, res, next) {
  const { itemType, itemId, newQuantity } = req.body;
  const errors = [];
  if (!VALID_ITEM_TYPES.includes(itemType)) errors.push('ItemType phải là PRODUCT');
  if (!itemId || Number.isNaN(Number(itemId))) errors.push('ItemID là bắt buộc và phải là số');
  if (newQuantity === undefined || Number(newQuantity) < 0) errors.push('newQuantity là bắt buộc và không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateStockChange, validateAdjustStock };
