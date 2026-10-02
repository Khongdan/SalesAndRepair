const test = require('node:test');
const assert = require('node:assert/strict');

const { validateStockChange, validateAdjustStock } = require('../../src/validators/inventory.validator');
const ApiError = require('../../src/utils/apiError');

function runValidator(validator, body) {
  const req = { body };
  let capturedError = null;
  let passed = false;
  validator(req, {}, (err) => { if (err) capturedError = err; else passed = true; });
  return { capturedError, passed };
}

test('validateStockChange từ chối ItemType không hợp lệ', () => {
  const { capturedError } = runValidator(validateStockChange, { itemType: 'INVALID', itemId: 1, quantity: 5 });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('ItemType')));
});

test('validateStockChange từ chối số lượng bằng 0 hoặc âm', () => {
  const { capturedError: err1 } = runValidator(validateStockChange, { itemType: 'PRODUCT', itemId: 1, quantity: 0 });
  assert.ok(err1.errors.some((e) => e.includes('Số lượng')));

  const { capturedError: err2 } = runValidator(validateStockChange, { itemType: 'PRODUCT', itemId: 1, quantity: -3 });
  assert.ok(err2.errors.some((e) => e.includes('Số lượng')));
});

test('validateStockChange cho qua với dữ liệu nhập/xuất kho hợp lệ', () => {
  const { passed } = runValidator(validateStockChange, { itemType: 'PRODUCT', itemId: 5, quantity: 10 });
  assert.equal(passed, true);
});

test('validateAdjustStock cho phép newQuantity = 0 (kiểm kê về 0, không phải "thiếu giá trị")', () => {
  const { passed, capturedError } = runValidator(validateAdjustStock, { itemType: 'PRODUCT', itemId: 1, newQuantity: 0 });
  assert.equal(passed, true);
  assert.equal(capturedError, null);
});

test('validateAdjustStock từ chối newQuantity âm', () => {
  const { capturedError } = runValidator(validateAdjustStock, { itemType: 'PRODUCT', itemId: 1, newQuantity: -1 });
  assert.ok(capturedError instanceof ApiError);
});

test('validateAdjustStock từ chối khi thiếu newQuantity', () => {
  const { capturedError } = runValidator(validateAdjustStock, { itemType: 'PRODUCT', itemId: 1 });
  assert.ok(capturedError instanceof ApiError);
});
