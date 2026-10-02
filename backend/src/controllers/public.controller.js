const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const productService = require('../services/product.service');

/**
 * Trang công khai (không cần đăng nhập) hiển thị khi khách hàng quét mã QR
 * dán trên sản phẩm/xe — chỉ trả về thông tin an toàn để công khai (xem
 * product.service.js#findPublicByCode).
 *
 * Lưu ý: Linh kiện đã GỘP vào Products (xem migration 006) nên getPublicComponent
 * giờ chỉ là alias của getPublicProduct — giữ lại route /scan/components/:code
 * để các mã QR đã in/dán lên hàng từ trước khi gộp vẫn mở được bình thường.
 */
const getPublicProduct = asyncHandler(async (req, res) => {
  const product = await productService.findPublicByCode(req.params.code);
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm');
  return success(res, product, 'Lấy thông tin sản phẩm thành công');
});

module.exports = { getPublicProduct, getPublicComponent: getPublicProduct };
