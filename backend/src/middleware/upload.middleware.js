/**
 * Middleware upload hình ảnh dùng chung cho Sản phẩm / Linh kiện (và có thể
 * tái sử dụng cho các module khác sau này).
 *
 * Frontend chỉ cần gửi 1 file qua field "image" (multipart/form-data) — dù
 * người dùng chọn ảnh từ thư viện hay chụp trực tiếp bằng camera thì trình
 * duyệt/điện thoại đều tạo ra một file ảnh bình thường, nên backend không
 * cần phân biệt 2 nguồn này.
 *
 * File được lưu vào ổ đĩa tại backend/public/uploads/<folder>/ với tên file
 * ngẫu nhiên (chống trùng + chống đoán được tên file người khác upload).
 * Thư mục public/uploads được serve tĩnh ở server.js (route /uploads/...).
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const ApiError = require('../utils/apiError');

const UPLOAD_ROOT = path.join(__dirname, '..', '..', 'public', 'uploads');
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function buildUploader(folder) {
  const destDir = path.join(UPLOAD_ROOT, folder);
  ensureDir(destDir);

  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, destDir),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
      const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;
      cb(null, uniqueName);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter: (req, file, cb) => {
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(new ApiError(400, 'Chỉ chấp nhận file ảnh (JPEG, PNG, WEBP, GIF)'));
      }
      cb(null, true);
    },
  }).single('image');

  // Bọc lại để chuyển lỗi của multer (file quá lớn, sai định dạng...)
  // thành ApiError đi qua errorHandler chung thay vì để Express báo lỗi generic.
  return (req, res, next) => {
    upload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(new ApiError(400, 'Ảnh quá lớn, kích thước tối đa là 5MB'));
        }
        return next(new ApiError(400, `Lỗi upload ảnh: ${err.message}`));
      }
      if (err) return next(err);
      if (!req.file) return next(new ApiError(400, 'Vui lòng chọn một file ảnh'));
      next();
    });
  };
}

module.exports = { buildUploader, UPLOAD_ROOT };
