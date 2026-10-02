/**
 * Bọc các hàm async controller để tự động bắt lỗi và forward
 * sang errorHandler middleware, tránh lặp try/catch ở mọi controller.
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;
