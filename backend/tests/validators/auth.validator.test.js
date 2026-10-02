const test = require('node:test');
const assert = require('node:assert/strict');

const { validateLogin, validateChangePassword } = require('../../src/validators/auth.validator');
const ApiError = require('../../src/utils/apiError');

function runValidator(validator, body) {
  const req = { body };
  let capturedError = null;
  let nextCalledWithoutError = false;
  const next = (err) => {
    if (err) capturedError = err;
    else nextCalledWithoutError = true;
  };
  validator(req, {}, next);
  return { capturedError, nextCalledWithoutError };
}

test('validateLogin từ chối khi thiếu username', () => {
  const { capturedError } = runValidator(validateLogin, { password: '123456' });
  assert.ok(capturedError instanceof ApiError);
  assert.equal(capturedError.status, 400);
  assert.ok(capturedError.errors.some((e) => e.includes('Tên đăng nhập')));
});

test('validateLogin từ chối khi mật khẩu dưới 4 ký tự', () => {
  const { capturedError } = runValidator(validateLogin, { username: 'admin', password: '123' });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('Mật khẩu')));
});

test('validateLogin cho qua khi dữ liệu hợp lệ', () => {
  const { capturedError, nextCalledWithoutError } = runValidator(validateLogin, { username: 'admin', password: 'Admin@123' });
  assert.equal(capturedError, null);
  assert.equal(nextCalledWithoutError, true);
});

test('validateLogin từ chối username chỉ toàn khoảng trắng', () => {
  const { capturedError } = runValidator(validateLogin, { username: '   ', password: 'Admin@123' });
  assert.ok(capturedError instanceof ApiError);
});

test('validateChangePassword từ chối khi mật khẩu mới dưới 6 ký tự', () => {
  const { capturedError } = runValidator(validateChangePassword, { oldPassword: 'old123', newPassword: '123' });
  assert.ok(capturedError instanceof ApiError);
  assert.ok(capturedError.errors.some((e) => e.includes('Mật khẩu mới')));
});

test('validateChangePassword cho qua khi dữ liệu hợp lệ', () => {
  const { nextCalledWithoutError } = runValidator(validateChangePassword, { oldPassword: 'old123', newPassword: 'newpass123' });
  assert.equal(nextCalledWithoutError, true);
});
