const test = require('node:test');
const assert = require('node:assert/strict');

const ApiError = require('../../src/utils/apiError');
const asyncHandler = require('../../src/utils/asyncHandler');

test('ApiError mang đúng status, message và errors', () => {
  const err = new ApiError(404, 'Không tìm thấy sản phẩm', ['detail 1']);
  assert.equal(err.status, 404);
  assert.equal(err.message, 'Không tìm thấy sản phẩm');
  assert.deepEqual(err.errors, ['detail 1']);
  assert.ok(err instanceof Error);
});

test('ApiError mặc định errors là mảng rỗng khi không truyền', () => {
  const err = new ApiError(500, 'Lỗi hệ thống');
  assert.deepEqual(err.errors, []);
});

test('asyncHandler forward lỗi throw ra next() thay vì làm crash process', async () => {
  const boom = new Error('boom');
  const handler = asyncHandler(async () => {
    throw boom;
  });

  let capturedError = null;
  await handler({}, {}, (err) => { capturedError = err; });

  assert.equal(capturedError, boom);
});

test('asyncHandler không gọi next() khi handler thành công', async () => {
  const handler = asyncHandler(async (req, res) => {
    res.sent = true;
  });

  const res = {};
  let nextCalled = false;
  await handler({}, res, () => { nextCalled = true; });

  assert.equal(res.sent, true);
  assert.equal(nextCalled, false);
});
