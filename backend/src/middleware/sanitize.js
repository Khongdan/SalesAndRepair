/**
 * Middleware làm sạch input cơ bản: cắt khoảng trắng đầu/cuối của mọi string
 * trong req.body, req.query trước khi tới validator/controller. Không thay thế
 * validation nghiệp vụ — chỉ tránh lỗi vặt do khoảng trắng thừa (mã trùng do
 * user gõ " ABC" khác "ABC", v.v.).
 */
function trimDeep(obj) {
  if (typeof obj === 'string') return obj.trim();
  if (Array.isArray(obj)) return obj.map(trimDeep);
  if (obj && typeof obj === 'object') {
    const result = {};
    for (const key of Object.keys(obj)) {
      result[key] = trimDeep(obj[key]);
    }
    return result;
  }
  return obj;
}

function sanitizeInput(req, res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = trimDeep(req.body);
  }
  next();
}

module.exports = sanitizeInput;
