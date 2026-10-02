const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const customerService = require('../services/customer.service');
const { logActivity } = require('../services/activityLog.service');

const getCustomers = asyncHandler(async (req, res) => {
  const { page, pageSize, search, all } = req.query;
  if (all === 'true') {
    const items = await customerService.listAll();
    return success(res, items, 'Lấy danh sách khách hàng thành công');
  }
  const result = await customerService.listCustomers({
    page: Number(page) || 1,
    pageSize: Math.min(Number(pageSize) || 20, 100),
    search: search || '',
  });
  return success(res, result, 'Lấy danh sách khách hàng thành công');
});

const getCustomerById = asyncHandler(async (req, res) => {
  const customer = await customerService.findById(Number(req.params.id));
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');
  return success(res, customer, 'Lấy thông tin khách hàng thành công');
});

const getCustomerHistory = asyncHandler(async (req, res) => {
  const customerId = Number(req.params.id);
  const customer = await customerService.findById(customerId);
  if (!customer) throw new ApiError(404, 'Không tìm thấy khách hàng');

  const history = await customerService.getHistory(customerId);
  return success(res, history, 'Lấy lịch sử khách hàng thành công');
});

const createCustomer = asyncHandler(async (req, res) => {
  if (req.body.phone) {
    const existing = await customerService.findByPhone(req.body.phone);
    if (existing) throw new ApiError(409, 'Số điện thoại đã được sử dụng bởi khách hàng khác');
  }
  const customerId = await customerService.createCustomer(req.body);
  const created = await customerService.findById(customerId);
  logActivity({ userId: req.user.userId, action: 'CREATE_CUSTOMER', targetTable: 'Customers', targetId: customerId, description: `Thêm khách hàng ${created.FullName}` });
  return success(res, created, 'Tạo khách hàng thành công', 201);
});

const updateCustomer = asyncHandler(async (req, res) => {
  const customerId = Number(req.params.id);
  const existing = await customerService.findById(customerId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy khách hàng');

  await customerService.updateCustomer(customerId, req.body);
  const updated = await customerService.findById(customerId);
  logActivity({ userId: req.user.userId, action: 'UPDATE_CUSTOMER', targetTable: 'Customers', targetId: customerId, description: `Sửa khách hàng ${updated.FullName}` });
  return success(res, updated, 'Cập nhật khách hàng thành công');
});

const deleteCustomer = asyncHandler(async (req, res) => {
  const customerId = Number(req.params.id);
  const existing = await customerService.findById(customerId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy khách hàng');

  await customerService.deleteCustomer(customerId);
  logActivity({ userId: req.user.userId, action: 'DELETE_CUSTOMER', targetTable: 'Customers', targetId: customerId, description: `Xóa khách hàng ${existing.FullName}` });
  return success(res, {}, 'Xóa khách hàng thành công');
});

module.exports = {
  getCustomers,
  getCustomerById,
  getCustomerHistory,
  createCustomer,
  updateCustomer,
  deleteCustomer,
};
