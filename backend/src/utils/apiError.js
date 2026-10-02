/**
 * Lớp lỗi tùy chỉnh mang theo HTTP status + danh sách lỗi chi tiết,
 * để errorHandler trả JSON đúng format { success:false, message, errors }.
 */
class ApiError extends Error {
  constructor(status, message, errors = []) {
    super(message);
    this.status = status;
    this.errors = errors;
  }
}

module.exports = ApiError;
