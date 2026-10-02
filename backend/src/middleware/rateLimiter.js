/**
 * Rate limiting cho các endpoint nhạy cảm (mục 23: bảo mật).
 * loginLimiter: chống brute-force mật khẩu — giới hạn số lần thử đăng nhập
 * theo IP trong 1 cửa sổ thời gian, không phụ thuộc việc đăng nhập đúng hay sai.
 */
const rateLimit = require('express-rate-limit');

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 10, // tối đa 10 lần thử mỗi IP trong cửa sổ trên
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Bạn đã thử đăng nhập quá nhiều lần. Vui lòng thử lại sau 15 phút.',
    errors: [],
  },
});

// Giới hạn chung cho toàn bộ API — nới lỏng hơn, chỉ để chặn lạm dụng bất thường.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Quá nhiều yêu cầu từ địa chỉ IP này. Vui lòng thử lại sau.',
    errors: [],
  },
});

module.exports = { loginLimiter, apiLimiter };
