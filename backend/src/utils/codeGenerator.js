/**
 * Sinh mã đơn/phiếu dùng chung (SalesOrderCode, RepairOrderCode, TransactionCode...).
 *
 * Trộn cả chữ và số (thay vì chỉ dùng timestamp toàn số như trước) để:
 *  - Mã ngắn gọn hơn nhiều so với kiểu "SO" + Date.now() + số ngẫu nhiên,
 *    dễ đọc/dễ gõ tay khi khách cần ghi mã hóa đơn làm nội dung chuyển khoản.
 *  - Không gian mã lớn hơn nhiều so với chỉ dùng chữ số (36^8 tổ hợp),
 *    nên rất khó trùng dù cửa hàng phát sinh nhiều đơn mỗi ngày.
 * Bỏ các ký tự dễ nhầm lẫn khi đọc/viết tay: số 0/1 và chữ O/I.
 */
const ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';

function generateCode(prefix, length = 8) {
  let code = '';
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return `${prefix}${code}`;
}

module.exports = { generateCode };
