const test = require('node:test');
const assert = require('node:assert/strict');

const sanitizeInput = require('../../src/middleware/sanitize');

test('sanitizeInput cắt khoảng trắng đầu/cuối của chuỗi ở cấp cao nhất', () => {
  const req = { body: { productCode: '  SP001  ', productName: 'iPhone 13' } };
  sanitizeInput(req, {}, () => {});
  assert.equal(req.body.productCode, 'SP001');
  assert.equal(req.body.productName, 'iPhone 13');
});

test('sanitizeInput cắt khoảng trắng ở object lồng nhau (vd: device trong tạo phiếu sửa chữa)', () => {
  const req = { body: { customerId: 1, device: { deviceType: '  Điện thoại  ', brand: ' Apple ' } } };
  sanitizeInput(req, {}, () => {});
  assert.equal(req.body.device.deviceType, 'Điện thoại');
  assert.equal(req.body.device.brand, 'Apple');
});

test('sanitizeInput cắt khoảng trắng trong từng phần tử của mảng (vd: items trong đơn nhập hàng)', () => {
  const req = { body: { items: [{ itemType: ' PRODUCT ' }, { itemType: ' COMPONENT ' }] } };
  sanitizeInput(req, {}, () => {});
  assert.equal(req.body.items[0].itemType, 'PRODUCT');
  assert.equal(req.body.items[1].itemType, 'COMPONENT');
});

test('sanitizeInput không đổi giá trị số/boolean/null', () => {
  const req = { body: { quantity: 5, isActive: true, note: null } };
  sanitizeInput(req, {}, () => {});
  assert.equal(req.body.quantity, 5);
  assert.equal(req.body.isActive, true);
  assert.equal(req.body.note, null);
});

test('sanitizeInput luôn gọi next() để không chặn request', () => {
  const req = { body: { a: '1' } };
  let nextCalled = false;
  sanitizeInput(req, {}, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('sanitizeInput không lỗi khi req.body rỗng hoặc không tồn tại', () => {
  const req = {};
  assert.doesNotThrow(() => sanitizeInput(req, {}, () => {}));
});
