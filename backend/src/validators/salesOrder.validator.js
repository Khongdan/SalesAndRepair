const ApiError = require('../utils/apiError');

const VALID_PAYMENT_METHODS = ['CASH', 'TRANSFER', 'MIXED'];

function validateCreateSalesOrder(req, res, next) {
  const { items, paymentMethod, discountAmount } = req.body;
  const errors = [];

  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Đơn hàng phải có ít nhất 1 sản phẩm');
  } else {
    items.forEach((item, idx) => {
      if (!item.productId || Number.isNaN(Number(item.productId))) errors.push(`Dòng ${idx + 1}: ProductID là bắt buộc`);
      if (!item.quantity || Number(item.quantity) <= 0) errors.push(`Dòng ${idx + 1}: Số lượng phải lớn hơn 0`);
      if (item.unitPrice === undefined || Number(item.unitPrice) < 0) errors.push(`Dòng ${idx + 1}: Đơn giá không được âm`);
      if (item.warrantyMonths !== undefined && Number(item.warrantyMonths) < 0) errors.push(`Dòng ${idx + 1}: Số tháng bảo hành không được âm`);
    });
  }

  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) {
    errors.push('Phương thức thanh toán phải là CASH, TRANSFER hoặc MIXED');
  }
  if (discountAmount !== undefined && Number(discountAmount) < 0) {
    errors.push('Số tiền giảm giá không được âm');
  }

  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateSalesPayment(req, res, next) {
  const { amount, paymentMethod } = req.body;
  const errors = [];
  if (!amount || Number(amount) <= 0) errors.push('Số tiền phải lớn hơn 0');
  if (!VALID_PAYMENT_METHODS.includes(paymentMethod)) errors.push('Phương thức thanh toán không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = { validateCreateSalesOrder, validateSalesPayment };
