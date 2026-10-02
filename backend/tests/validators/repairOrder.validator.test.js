const test = require('node:test');
const assert = require('node:assert/strict');

const {
  validateCreateRepairOrder,
  validateCreatePriceQuote,
  validateQuoteDecision,
  validateUseComponent,
} = require('../../src/validators/repairOrder.validator');
const ApiError = require('../../src/utils/apiError');

function runValidator(validator, body) {
  const req = { body };
  let capturedError = null;
  let passed = false;
  validator(req, {}, (err) => { if (err) capturedError = err; else passed = true; });
  return { capturedError, passed };
}

test('validateCreateRepairOrder yêu cầu customerId hoặc customerName (khách vãng lai)', () => {
  const { capturedError } = runValidator(validateCreateRepairOrder, { device: { deviceType: 'Điện thoại' } });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('khách hàng')));
});

test('validateCreateRepairOrder yêu cầu deviceId HOẶC device — không có cả hai thì báo lỗi', () => {
  const { capturedError } = runValidator(validateCreateRepairOrder, { customerId: 1 });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('deviceId') || e.includes('device')));
});

test('validateCreateRepairOrder cho qua khi dùng deviceId đã có (không cần device object)', () => {
  const { passed } = runValidator(validateCreateRepairOrder, { customerId: 1, deviceId: 5 });
  assert.equal(passed, true);
});

test('validateCreateRepairOrder yêu cầu device.deviceType khi tạo thiết bị mới', () => {
  const { capturedError } = runValidator(validateCreateRepairOrder, { customerId: 1, device: {} });
  assert.ok(capturedError.errors.some((e) => e.includes('deviceType')));
});

test('validateCreatePriceQuote từ chối báo giá không có dòng nào', () => {
  const { capturedError } = runValidator(validateCreatePriceQuote, { items: [] });
  assert.ok(capturedError instanceof ApiError);
});

test('validateCreatePriceQuote từ chối itemType không hợp lệ trong dòng báo giá', () => {
  const { capturedError } = runValidator(validateCreatePriceQuote, {
    items: [{ itemType: 'INVALID', itemId: 1, quantity: 1, unitPrice: 1000 }],
  });
  assert.ok(capturedError.errors.some((e) => e.includes('ItemType')));
});

test('validateCreatePriceQuote cho qua khi có cả dòng SERVICE và PRODUCT hợp lệ', () => {
  const { passed } = runValidator(validateCreatePriceQuote, {
    items: [
      { itemType: 'SERVICE', itemId: 1, quantity: 1, unitPrice: 200000 },
      { itemType: 'PRODUCT', itemId: 2, quantity: 1, unitPrice: 1800000 },
    ],
  });
  assert.equal(passed, true);
});

test('validateQuoteDecision chỉ chấp nhận ACCEPTED hoặc REJECTED', () => {
  const { capturedError } = runValidator(validateQuoteDecision, { decision: 'MAYBE' });
  assert.ok(capturedError instanceof ApiError);

  const { passed } = runValidator(validateQuoteDecision, { decision: 'ACCEPTED' });
  assert.equal(passed, true);
});

test('validateUseComponent từ chối khi thiếu componentId hoặc số lượng không hợp lệ', () => {
  const { capturedError } = runValidator(validateUseComponent, { quantity: 0, unitPrice: 1000 });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.length >= 2); // thiếu componentId + quantity<=0
});
