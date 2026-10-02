const test = require('node:test');
const assert = require('node:assert/strict');

const { validateCreateProduct, validateUpdateProduct } = require('../../src/validators/product.validator');
const ApiError = require('../../src/utils/apiError');

function runValidator(validator, body) {
  const req = { body };
  let capturedError = null;
  let passed = false;
  validator(req, {}, (err) => { if (err) capturedError = err; else passed = true; });
  return { capturedError, passed };
}

test('validateCreateProduct từ chối khi thiếu tên sản phẩm (mã do hệ thống tự sinh, không validate)', () => {
  const { capturedError } = runValidator(validateCreateProduct, {});
  assert.ok(capturedError instanceof ApiError);
  assert.equal(capturedError.errors.length, 1);
});

test('validateCreateProduct từ chối giá nhập âm', () => {
  const { capturedError } = runValidator(validateCreateProduct, {
    productCode: 'SP001', productName: 'iPhone 13', importPrice: -1000,
  });
  assert.ok(capturedError.errors.some((e) => e.includes('Giá nhập')));
});

test('validateCreateProduct từ chối số lượng tồn âm', () => {
  const { capturedError } = runValidator(validateCreateProduct, {
    productCode: 'SP001', productName: 'iPhone 13', quantity: -5,
  });
  assert.ok(capturedError.errors.some((e) => e.includes('Số lượng tồn')));
});

test('validateCreateProduct cho qua khi dữ liệu hợp lệ và các trường giá là tùy chọn', () => {
  const { passed, capturedError } = runValidator(validateCreateProduct, {
    productCode: 'SP001', productName: 'iPhone 13',
  });
  assert.equal(passed, true);
  assert.equal(capturedError, null);
});

test('validateUpdateProduct không yêu cầu productCode (không được sửa)', () => {
  const { passed } = runValidator(validateUpdateProduct, { productName: 'iPhone 13 Pro', minStock: 3 });
  assert.equal(passed, true);
});

test('validateUpdateProduct từ chối khi thiếu tên sản phẩm', () => {
  const { capturedError } = runValidator(validateUpdateProduct, { minStock: 3 });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('Tên sản phẩm')));
});
