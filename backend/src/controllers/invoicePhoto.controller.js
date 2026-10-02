const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/apiError');
const { success } = require('../utils/response');
const invoicePhotoService = require('../services/invoicePhoto.service');
const { logActivity } = require('../services/activityLog.service');

const getPhotosByDate = asyncHandler(async (req, res) => {
  const { date } = req.query;
  if (!date) throw new ApiError(400, 'Thiếu tham số date (vd: 2026-01-15)');
  const items = await invoicePhotoService.listByDate(date);
  return success(res, items, 'Lấy ảnh hóa đơn theo ngày thành công');
});

const getDatesSummary = asyncHandler(async (req, res) => {
  const { fromDate, toDate } = req.query;
  const items = await invoicePhotoService.listDatesSummary({ fromDate, toDate });
  return success(res, items, 'Lấy tổng hợp số ảnh theo ngày thành công');
});

const createPhoto = asyncHandler(async (req, res) => {
  const { photoDate, imageUrl, note } = req.body;
  if (!photoDate || !imageUrl) throw new ApiError(400, 'Dữ liệu không hợp lệ', ['photoDate và imageUrl là bắt buộc']);

  const photoId = await invoicePhotoService.createPhoto({ photoDate, imageUrl, note, uploadedBy: req.user.userId });
  logActivity({ userId: req.user.userId, action: 'CREATE_INVOICE_PHOTO', targetTable: 'IncomingInvoicePhotos', targetId: photoId, description: `Thêm ảnh hóa đơn nhập hàng ngày ${photoDate}` });
  return success(res, { photoId }, 'Thêm ảnh hóa đơn thành công', 201);
});

const deletePhoto = asyncHandler(async (req, res) => {
  const photoId = Number(req.params.id);
  const existing = await invoicePhotoService.findById(photoId);
  if (!existing) throw new ApiError(404, 'Không tìm thấy ảnh');

  await invoicePhotoService.deletePhoto(photoId);
  logActivity({ userId: req.user.userId, action: 'DELETE_INVOICE_PHOTO', targetTable: 'IncomingInvoicePhotos', targetId: photoId, description: 'Xóa ảnh hóa đơn nhập hàng' });
  return success(res, {}, 'Xóa ảnh thành công');
});

module.exports = { getPhotosByDate, getDatesSummary, createPhoto, deletePhoto };
