/**
 * Helper chuẩn hóa response JSON cho toàn bộ API,
 * theo đúng format quy định trong tài liệu dự án.
 */
function success(res, data = {}, message = 'Thành công', status = 200) {
  return res.status(status).json({ success: true, message, data });
}

function fail(res, message = 'Có lỗi xảy ra', errors = [], status = 400) {
  return res.status(status).json({ success: false, message, errors });
}

module.exports = { success, fail };
