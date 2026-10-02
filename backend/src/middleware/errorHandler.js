/**
 * Middleware xử lý lỗi tập trung.
 * Đảm bảo mọi response lỗi đều theo format thống nhất:
 * { success: false, message, errors: [] }
 *
 * Bảo mật (mục 23): lỗi hệ thống (status 500 — thường là lỗi SQL Server,
 * lỗi kết nối, bug code...) KHÔNG được trả message/stack trace gốc về client
 * trong môi trường production, để tránh lộ chi tiết hạ tầng (tên bảng, cấu
 * trúc query, đường dẫn file...). Lỗi nghiệp vụ có chủ đích (ApiError với
 * status 4xx do validator/controller tạo ra) vẫn trả message rõ ràng vì đó
 * là thông tin hữu ích cho người dùng, không phải rò rỉ thông tin nhạy cảm.
 */
function notFoundHandler(req, res, next) {
  res.status(404).json({
    success: false,
    message: `Không tìm thấy route: ${req.method} ${req.originalUrl}`,
    errors: [],
  });
}

function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const isProduction = process.env.NODE_ENV === 'production';

  // Luôn log đầy đủ lỗi ở phía server để debug, bất kể môi trường.
  console.error(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} →`, err);

  const isInternalError = status >= 500;
  const message = isInternalError && isProduction
    ? 'Lỗi hệ thống. Vui lòng thử lại sau hoặc liên hệ quản trị viên.'
    : err.message || 'Lỗi hệ thống';

  res.status(status).json({
    success: false,
    message,
    errors: isInternalError && isProduction ? [] : (err.errors || []),
  });
}

module.exports = { notFoundHandler, errorHandler };
