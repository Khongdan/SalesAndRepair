const asyncHandler = require('../utils/asyncHandler');
const { success } = require('../utils/response');

/**
 * Trả về đường dẫn TƯƠNG ĐỐI (vd: /uploads/products/abc.jpg), KHÔNG kèm
 * domain/protocol cố định. Lý do: nếu build cứng domain lúc upload (vd:
 * http://localhost:5000/...), ảnh sẽ hiển thị sai/không lên khi truy cập
 * ứng dụng từ một địa chỉ khác (IP LAN, domain thật khi triển khai, hoặc
 * qua HTTPS reverse proxy). Frontend sẽ tự ghép domain hiện tại vào khi
 * hiển thị (xem frontend/src/utils/imageUrl.js).
 */
function buildFilePath(folder, filename) {
  return `/uploads/${folder}/${filename}`;
}

const uploadProductImage = asyncHandler(async (req, res) => {
  const url = buildFilePath('products', req.file.filename);
  return success(res, { url }, 'Tải ảnh sản phẩm lên thành công', 201);
});

const uploadRepairImage = asyncHandler(async (req, res) => {
  const url = buildFilePath('repairs', req.file.filename);
  return success(res, { url }, 'Tải ảnh xe lên thành công', 201);
});

// Ảnh dùng trong Cài đặt cửa hàng — hiện tại là ảnh QR nhận thanh toán
// (chụp/lưu từ app ngân hàng/MoMo của cửa hàng) để in trên hóa đơn/phiếu.
const uploadSettingsImage = asyncHandler(async (req, res) => {
  const url = buildFilePath('settings', req.file.filename);
  return success(res, { url }, 'Tải ảnh lên thành công', 201);
});

// Ảnh hóa đơn nhập hàng — dùng cho chức năng "Đối chiếu hàng nhập" trong Kho hàng.
const uploadInvoicePhoto = asyncHandler(async (req, res) => {
  const url = buildFilePath('invoices', req.file.filename);
  return success(res, { url }, 'Tải ảnh hóa đơn lên thành công', 201);
});

module.exports = {
  uploadProductImage, uploadRepairImage, uploadSettingsImage, uploadInvoicePhoto,
};
