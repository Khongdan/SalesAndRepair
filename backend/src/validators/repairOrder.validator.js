const ApiError = require('../utils/apiError');

function validateCreateRepairOrder(req, res, next) {
  const { customerId, customerName, deviceId, device } = req.body;
  const errors = [];

  // Cho phép 1 trong 2: chọn khách đã có (customerId) HOẶC nhập tay tên khách
  // vãng lai chưa có trong danh sách (customerName) — không phải khách nào
  // cũng có sẵn hồ sơ, kỹ thuật viên tiếp nhận vẫn cần tạo phiếu được ngay.
  const hasCustomerId = customerId !== undefined && customerId !== null && customerId !== '';
  const hasCustomerName = customerName && customerName.trim();
  if (!hasCustomerId && !hasCustomerName) {
    errors.push('Phải chọn khách hàng có sẵn hoặc nhập tên khách hàng mới');
  }
  if (hasCustomerId && Number.isNaN(Number(customerId))) {
    errors.push('CustomerID phải là số');
  }
  if (!deviceId && !device) errors.push('Phải cung cấp deviceId (thiết bị đã có) hoặc device (thiết bị mới)');
  if (!deviceId && device && (!device.deviceType || !device.deviceType.trim())) {
    errors.push('device.deviceType là bắt buộc khi tạo thiết bị mới');
  }

  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateUpdateStatus(req, res, next) {
  const { status, warrantyMonths } = req.body;
  const errors = [];
  if (!status || !status.trim()) {
    errors.push('status là bắt buộc');
  }
  if (warrantyMonths !== undefined && (Number.isNaN(Number(warrantyMonths)) || Number(warrantyMonths) < 0)) {
    errors.push('warrantyMonths phải là số không âm');
  }
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateCreatePriceQuote(req, res, next) {
  const { items } = req.body;
  const errors = [];
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('Báo giá phải có ít nhất 1 dòng công/sản phẩm');
  } else {
    items.forEach((item, idx) => {
      if (!['SERVICE', 'PRODUCT'].includes(item.itemType)) errors.push(`Dòng ${idx + 1}: ItemType phải là SERVICE hoặc PRODUCT`);
      if (!item.itemId || Number.isNaN(Number(item.itemId))) errors.push(`Dòng ${idx + 1}: ItemID là bắt buộc`);
      if (!item.quantity || Number(item.quantity) <= 0) errors.push(`Dòng ${idx + 1}: Số lượng phải lớn hơn 0`);
      if (item.unitPrice === undefined || Number(item.unitPrice) < 0) errors.push(`Dòng ${idx + 1}: Đơn giá không được âm`);
    });
  }
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateQuoteDecision(req, res, next) {
  const { decision } = req.body;
  if (!['ACCEPTED', 'REJECTED'].includes(decision)) {
    return next(new ApiError(400, 'Dữ liệu không hợp lệ', ['decision phải là ACCEPTED hoặc REJECTED']));
  }
  next();
}

function validateAddService(req, res, next) {
  const { repairServiceId, quantity, unitPrice } = req.body;
  const errors = [];
  if (!repairServiceId || Number.isNaN(Number(repairServiceId))) errors.push('repairServiceId là bắt buộc');
  if (!quantity || Number(quantity) <= 0) errors.push('Số lượng phải lớn hơn 0');
  if (unitPrice === undefined || Number(unitPrice) < 0) errors.push('Đơn giá không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validateUseComponent(req, res, next) {
  const { componentId, quantity, unitPrice } = req.body;
  const errors = [];
  if (!componentId || Number.isNaN(Number(componentId))) errors.push('componentId là bắt buộc');
  if (!quantity || Number(quantity) <= 0) errors.push('Số lượng phải lớn hơn 0');
  if (unitPrice === undefined || Number(unitPrice) < 0) errors.push('Đơn giá không được âm');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

function validatePayment(req, res, next) {
  const { amount, paymentMethod } = req.body;
  const errors = [];
  if (!amount || Number(amount) <= 0) errors.push('Số tiền phải lớn hơn 0');
  if (!['CASH', 'TRANSFER', 'MIXED'].includes(paymentMethod)) errors.push('Phương thức thanh toán không hợp lệ');
  if (errors.length) return next(new ApiError(400, 'Dữ liệu không hợp lệ', errors));
  next();
}

module.exports = {
  validateCreateRepairOrder,
  validateUpdateStatus,
  validateCreatePriceQuote,
  validateQuoteDecision,
  validateAddService,
  validateUseComponent,
  validatePayment,
};
