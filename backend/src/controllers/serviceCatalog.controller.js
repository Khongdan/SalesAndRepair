const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const serviceCatalogService = require('../services/serviceCatalog.service');

const getServices = asyncHandler(async (req, res) => {
  const services = await serviceCatalogService.listServices();
  return success(res, services, 'Lấy danh sách dịch vụ sửa chữa thành công');
});

const createService = asyncHandler(async (req, res) => {
  const id = await serviceCatalogService.createService(req.body);
  const created = await serviceCatalogService.findById(id);
  return success(res, created, 'Tạo dịch vụ sửa chữa thành công', 201);
});

const updateService = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await serviceCatalogService.findById(id);
  if (!existing) throw new ApiError(404, 'Không tìm thấy dịch vụ sửa chữa');

  await serviceCatalogService.updateService(id, req.body);
  const updated = await serviceCatalogService.findById(id);
  return success(res, updated, 'Cập nhật dịch vụ sửa chữa thành công');
});

const deleteService = asyncHandler(async (req, res) => {
  const id = Number(req.params.id);
  const existing = await serviceCatalogService.findById(id);
  if (!existing) throw new ApiError(404, 'Không tìm thấy dịch vụ sửa chữa');

  await serviceCatalogService.deleteService(id);
  return success(res, {}, 'Xóa dịch vụ sửa chữa thành công');
});

module.exports = { getServices, createService, updateService, deleteService };
