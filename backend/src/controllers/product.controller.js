const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const productService = require('../services/product.service');
const { logActivity } = require('../services/activityLog.service');

const getProducts = asyncHandler(async (req, res) => {
  const { page, pageSize, search, categoryId, status } = req.query;
  const result = await productService.listProducts({
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
    search: search || '',
    categoryId: categoryId ? Number(categoryId) : undefined,
    status,
  });
  return success(res, result, 'Lấy danh sách sản phẩm thành công');
});

const getProductById = asyncHandler(async (req, res) => {
  const product = await productService.findById(Number(req.params.id));
  if (!product) throw new ApiError(404, 'Không tìm thấy sản phẩm');
  return success(res, product, 'Lấy thông tin sản phẩm thành công');
});

const getLowStockProducts = asyncHandler(async (req, res) => {
  const items = await productService.listLowStock();
  return success(res, items, 'Lấy danh sách sản phẩm sắp hết hàng thành công');
});

/**
 * Tạo sản phẩm mới. Quantity ban đầu (nếu có) là tồn kho khởi tạo —
 * không tạo InventoryTransactions cho lần khởi tạo này vì đây chưa phải
 * một giao dịch nhập/xuất thực tế (tương tự "opening balance").
 */
const createProduct = asyncHandler(async (req, res) => {
  // Mã sản phẩm (ProductCode) do hệ thống tự sinh (SP001, SP002...) —
  // không nhận mã do client gửi lên, kể cả khi có gửi cũng bị bỏ qua.
  const productId = await productService.createProduct(req.body);
  const created = await productService.findById(productId);
  logActivity({ userId: req.user.userId, action: 'CREATE_PRODUCT', targetTable: 'Products', targetId: productId, description: `Thêm sản phẩm ${created.ProductCode} — ${created.ProductName}` });
  return success(res, created, 'Tạo sản phẩm thành công', 201);
});

const updateProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const existing = await productService.findById(productId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy sản phẩm');

  await productService.updateProduct(productId, req.body);
  const updated = await productService.findById(productId);
  logActivity({ userId: req.user.userId, action: 'UPDATE_PRODUCT', targetTable: 'Products', targetId: productId, description: `Sửa sản phẩm ${updated.ProductCode}` });
  return success(res, updated, 'Cập nhật sản phẩm thành công');
});

const deleteProduct = asyncHandler(async (req, res) => {
  const productId = Number(req.params.id);
  const existing = await productService.findById(productId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy sản phẩm');

  await productService.softDeleteProduct(productId);
  logActivity({ userId: req.user.userId, action: 'DELETE_PRODUCT', targetTable: 'Products', targetId: productId, description: `Ngừng kinh doanh sản phẩm ${existing.ProductCode}` });
  return success(res, {}, 'Ngừng kinh doanh sản phẩm thành công');
});

module.exports = {
  getProducts,
  getProductById,
  getLowStockProducts,
  createProduct,
  updateProduct,
  deleteProduct,
};
