const test = require('node:test');
const assert = require('node:assert/strict');

const { toCsv } = require('../../src/utils/csv');

test('toCsv trả về chuỗi rỗng khi không có dữ liệu', () => {
  assert.equal(toCsv([]), '');
  assert.equal(toCsv(null), '');
  assert.equal(toCsv(undefined), '');
});

test('toCsv tạo đúng dòng header từ key của object đầu tiên', () => {
  const csv = toCsv([{ Period: '2026-01-01', Revenue: 100000 }]);
  const lines = csv.split('\n');
  assert.equal(lines[0], 'Period,Revenue');
  assert.equal(lines[1], '2026-01-01,100000');
});

test('toCsv escape giá trị chứa dấu phẩy bằng dấu ngoặc kép', () => {
  const csv = toCsv([{ Name: 'Nguyễn Văn A, Q.1' }]);
  assert.equal(csv, 'Name\n"Nguyễn Văn A, Q.1"');
});

test('toCsv escape dấu ngoặc kép bên trong giá trị bằng cách nhân đôi', () => {
  const csv = toCsv([{ Note: 'Máy "hỏng" màn hình' }]);
  assert.equal(csv, 'Note\n"Máy ""hỏng"" màn hình"');
});

test('toCsv escape giá trị chứa xuống dòng', () => {
  const csv = toCsv([{ Note: 'Dòng 1\nDòng 2' }]);
  assert.equal(csv, 'Note\n"Dòng 1\nDòng 2"');
});

test('toCsv chuyển null/undefined thành chuỗi rỗng, không phải chữ "null"', () => {
  const csv = toCsv([{ A: null, B: undefined, C: 0 }]);
  const lines = csv.split('\n');
  assert.equal(lines[1], ',,0');
});

test('toCsv xử lý nhiều dòng theo đúng thứ tự', () => {
  const csv = toCsv([
    { Code: 'SP001', Qty: 3 },
    { Code: 'SP002', Qty: 5 },
  ]);
  const lines = csv.split('\n');
  assert.equal(lines.length, 3);
  assert.equal(lines[1], 'SP001,3');
  assert.equal(lines[2], 'SP002,5');
});
