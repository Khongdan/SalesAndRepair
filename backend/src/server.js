/**
 * Điểm khởi động (entry point) của backend.
 * Chịu trách nhiệm: cấu hình Express app, middleware, routes, error handling.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const { loginLimiter, apiLimiter } = require('./middleware/rateLimiter');
const sanitizeInput = require('./middleware/sanitize');

const healthRoutes = require('./routes/health.routes');
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const categoryRoutes = require('./routes/category.routes');
const productRoutes = require('./routes/product.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const invoicePhotoRoutes = require('./routes/invoicePhoto.routes');
const customerRoutes = require('./routes/customer.routes');
const saleRoutes = require('./routes/sale.routes');
const serviceCatalogRoutes = require('./routes/serviceCatalog.routes');
const deviceRoutes = require('./routes/device.routes');
const repairRoutes = require('./routes/repair.routes');
const reportRoutes = require('./routes/report.routes');
const warrantyRoutes = require('./routes/warranty.routes');
const activityLogRoutes = require('./routes/activityLog.routes');
const storeSettingsRoutes = require('./routes/storeSettings.routes');
const uploadRoutes = require('./routes/upload.routes');
const publicRoutes = require('./routes/public.routes');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const path = require('path');

const app = express();

// ---------- Bảo mật (mục 23 tài liệu dự án) ----------
// Helmet: thiết lập các HTTP header bảo mật cơ bản (ẩn X-Powered-By, chống
// clickjacking, chống MIME sniffing...).
app.use(helmet());

// CORS: chỉ cho phép các origin được khai báo trong .env (ALLOWED_ORIGINS,
// phân tách bằng dấu phẩy). Nếu không khai báo (môi trường dev), cho phép tất cả
// để tiện chạy `npm run dev` cục bộ — PHẢI khai báo cụ thể khi triển khai thật.
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map((o) => o.trim())
  : null;
app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
}));

// Giới hạn tốc độ request chung, và riêng cho /api/auth/login (chống brute-force).
app.use('/api', apiLimiter);
app.use('/api/auth/login', loginLimiter);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(sanitizeInput);
app.use(morgan('dev'));

// Ảnh sản phẩm/linh kiện upload lên được lưu tĩnh tại backend/public/uploads
// và serve công khai qua /uploads/... (không cần đăng nhập để xem ảnh, vì
// URL ảnh có thể được hiển thị trực tiếp trong <img src>).
//
// QUAN TRỌNG: helmet() ở trên mặc định gắn header
// "Cross-Origin-Resource-Policy: same-origin" cho MỌI response, kể cả file
// tĩnh. Vì frontend (vd: localhost:5173) và backend (vd: localhost:5000)
// là 2 origin khác nhau (khác cổng), trình duyệt sẽ CHẶN việc tải ảnh này
// trong thẻ <img> — ảnh không hiện lên, chỉ thấy chữ alt. Phải nới lỏng
// riêng cho route ảnh tĩnh này thành "cross-origin" thì ảnh mới hiển thị
// được từ một origin khác.
app.use(
  '/uploads',
  helmet.crossOriginResourcePolicy({ policy: 'cross-origin' }),
  express.static(path.join(__dirname, '..', 'public', 'uploads')),
);

// ---------- Routes ----------
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);         // Giai đoạn 3: login, me, change-password
app.use('/api/users', userRoutes);        // Giai đoạn 3: CRUD người dùng (chỉ ADMIN)
app.use('/api/roles', roleRoutes);        // Giai đoạn 3: danh sách vai trò
app.use('/api/categories', categoryRoutes); // Giai đoạn 4: danh mục sản phẩm
app.use('/api/products', productRoutes);    // Sản phẩm — ĐÃ GỘP chung với Linh kiện cũ thành 1 danh sách duy nhất
app.use('/api/inventory', inventoryRoutes);  // Giai đoạn 4: nhập/xuất/điều chỉnh/lịch sử kho
app.use('/api/invoice-photos', invoicePhotoRoutes); // Đối chiếu hàng nhập bằng ảnh hóa đơn theo ngày (thay cho Nhập hàng/Nhà cung cấp cũ)
app.use('/api/customers', customerRoutes);      // Giai đoạn 6: khách hàng + lịch sử mua/sửa chữa
app.use('/api/sales', saleRoutes);              // Giai đoạn 6: bán hàng/POS (transaction giảm kho + thanh toán)
app.use('/api/repair-services', serviceCatalogRoutes); // Giai đoạn 7: bảng giá công sửa chữa
app.use('/api/devices', deviceRoutes);          // Giai đoạn 7 (tối giản): thiết bị theo khách hàng
app.use('/api/repairs', repairRoutes);          // Giai đoạn 7: phiếu sửa chữa, báo giá, sản phẩm/linh kiện sử dụng
app.use('/api/reports', reportRoutes);          // Giai đoạn 8: báo cáo + dashboard tổng hợp
app.use('/api/warranty', warrantyRoutes);        // Tra cứu bảo hành (SĐT/biển số) + danh sách sắp hết hạn
app.use('/api/activity-logs', activityLogRoutes); // Giai đoạn 8: nhật ký hệ thống (chỉ ADMIN)
app.use('/api/store-settings', storeSettingsRoutes); // Trang Cài đặt: thông tin cửa hàng (in hóa đơn)
app.use('/api/uploads', uploadRoutes);          // Upload ảnh sản phẩm, hóa đơn nhập hàng (chọn thư viện hoặc chụp trực tiếp)
app.use('/api/public', publicRoutes);            // Trang công khai xem thông tin khi quét mã QR (không cần đăng nhập)

// Các route nghiệp vụ khác sẽ được thêm khi có yêu cầu mới,
// mỗi module import riêng theo dạng: app.use('/api/xxx', require('./routes/xxx.routes'));

app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Sales & Repair Management API đang chạy',
    data: { docs: '/api/health' },
  });
});

// ---------- Error handling ----------
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Backend đang chạy tại http://localhost:${PORT}`);
});

// ---------- An toàn ở tầng process (mục 20 & 23) ----------
// Bắt lỗi không mong muốn để log rõ ràng thay vì để process crash âm thầm
// hoặc lộ stack trace ra console không kiểm soát trong môi trường production.
process.on('unhandledRejection', (reason) => {
  console.error('⚠️  Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err);
  // Thoát process sau lỗi nghiêm trọng không bắt được — để process manager
  // (pm2, Docker restart policy...) khởi động lại tiến trình sạch.
  process.exit(1);
});
