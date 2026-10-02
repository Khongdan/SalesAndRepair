# Sales & Repair Management System

Phần mềm quản lý bán hàng kết hợp dịch vụ sửa chữa cho cửa hàng linh kiện & sửa xe máy, xe đạp.

> Dự án đã hoàn thành đầy đủ **10/10 giai đoạn** (xem mục "Trạng thái triển khai" ở cuối file).

## Chạy nhanh — địa chỉ truy cập toàn bộ chương trình

Sau khi cài đặt xong (xem các bước bên dưới), chạy **một lệnh duy nhất ở thư mục gốc**:

```bash
npm run install:all   # chỉ cần chạy 1 lần đầu tiên
npm run dev           # chạy cùng lúc cả backend lẫn frontend
```

| Thành phần | Địa chỉ | Ghi chú |
|---|---|---|
| **Toàn bộ chương trình (mở trình duyệt vào đây)** | **http://localhost:5173** | Đây là địa chỉ chính bạn dùng hằng ngày |
| Backend API (nội bộ, frontend tự gọi) | http://localhost:5000/api | Không cần mở trực tiếp, trừ khi debug |
| Kiểm tra kết nối Database | http://localhost:5000/api/health | Mở thử nếu nghi ngờ backend/DB có vấn đề |

> `npm run dev` KHÔNG tự in ra một "đường dẫn duy nhất" vì đây là 2 chương trình riêng
> (backend Express + frontend Vite) chạy song song trên 2 cổng khác nhau — đó là kiến trúc
> tách biệt frontend/backend đúng theo yêu cầu dự án (mục 27, 28), không phải lỗi. Bạn luôn mở
> **http://localhost:5173** trên trình duyệt; frontend sẽ tự động gọi sang backend ở cổng 5000
> phía sau, bạn không cần tự gõ địa chỉ backend.

Nếu bạn không muốn dùng script gộp ở trên, vẫn có thể chạy riêng từng phần (2 terminal) như hướng
dẫn chi tiết bên dưới — kết quả giống hệt nhau.

## Công nghệ

| Layer     | Công nghệ |
|-----------|-----------|
| Frontend  | Vite + React + JavaScript |
| Backend   | Node.js + Express |
| Database  | Microsoft SQL Server |
| DB Driver | `mssql` package |
| Auth      | JWT + bcrypt (triển khai ở Giai đoạn 3) |

## Cấu trúc thư mục

```
sales-repair-management/
├── frontend/       # Ứng dụng React (Vite)
├── backend/        # REST API (Express)
├── database/       # schema.sql, seed.sql
├── package.json    # script gộp: npm run dev chạy cùng lúc backend + frontend
└── README.md
```

## Hướng dẫn cài đặt & chạy

### 1. Yêu cầu hệ thống
- Node.js >= 18
- SQL Server 2019+ (hoặc SQL Server Express) đang chạy
- SSMS hoặc Azure Data Studio để chạy file .sql

### 2. Tạo Database
1. Mở SSMS, kết nối SQL Server instance.
2. Chạy `database/schema.sql` để tạo database `SalesRepairDB` và toàn bộ bảng.
3. (Tùy chọn, để có dữ liệu demo) Chạy `database/seed.sql` để chèn dữ liệu mẫu.
4. Chạy các file trong `database/migrations/` theo đúng thứ tự số (001 → 002 → ...) — an toàn để chạy kể cả khi phần đó đã có sẵn.

 Chỉ chạy `schema.sql`/`seed.sql` **1 lần** trên database rỗng. Nếu chạy lại
`seed.sql` trên database đã có dữ liệu và gặp lỗi, hoặc muốn làm lại từ đầu,
xem mục "Xử lý sự cố" trong `database/README.md` (có sẵn script
`database/reset-fresh-install.sql` để xóa sạch làm lại).

Chi tiết: `database/README.md`.

### 3. Cấu hình Backend
```bash
cd backend
cp .env.example .env
```
Điền thông tin kết nối SQL Server thật của bạn vào `.env`:
```
DATABASE_SERVER=localhost
DATABASE_NAME=SalesRepairDB
DATABASE_USER=sa
DATABASE_PASSWORD=your_password
```

### 4. Cài đặt & chạy Backend

**Cách 1 — chạy gộp cả 2 (khuyến nghị):** xem mục "🚀 Chạy nhanh" ở đầu file — chỉ cần
`npm run install:all` rồi `npm run dev` ở thư mục gốc.

**Cách 2 — chạy riêng từng phần (2 terminal):**
```bash
cd backend
npm install
npm run dev
```
API chạy tại `http://localhost:5000`. Kiểm tra kết nối DB: `GET http://localhost:5000/api/health`.

Chạy test đơn vị (không cần DB, không cần cài thêm package):
```bash
npm test
```

### 5. Cài đặt & chạy Frontend (nếu chạy riêng theo Cách 2 ở trên)
```bash
cd frontend
npm install
npm run dev
```
Frontend chạy tại `http://localhost:5173`.

### 5b. Font chữ — Times New Roman (chạy trên cả Windows lẫn Linux)

Toàn bộ giao diện (kể cả hóa đơn/phiếu khi in) dùng font **Times New Roman**.
Windows và macOS đã có sẵn font này. Trên **Linux thì chưa có sẵn** (đây là
font độc quyền của Microsoft) — nhưng bạn **không cần làm gì thêm**: trình
duyệt sẽ tự tải "Tinos" (font mã nguồn mở của Google, kích thước/khoảng
cách chữ giống hệt Times New Roman) làm phương án dự phòng, nên giao diện
vẫn hiển thị đúng dáng chữ ngay cả khi máy Linux chưa cài Times New Roman.

Muốn máy Linux có **sẵn font Times New Roman thật** ở cấp hệ điều hành (vd
để dùng cho phần mềm khác ngoài trình duyệt), chạy 1 lần trước khi dùng
chương trình:
```bash
chmod +x scripts/install-fonts-linux.sh
sudo ./scripts/install-fonts-linux.sh
```
(Hỗ trợ Debian/Ubuntu tự động; Fedora/RHEL và Arch xem ghi chú ngay trong
file script.)

### 6. Tài khoản demo (sau khi chạy seed.sql)

| Vai trò     | Username     | Password (demo) |
|-------------|--------------|------------------|
| Admin       | admin        | Admin@123 |
| Manager     | manager01    | Manager@123 |
| Cashier     | cashier01    | Cashier@123 |
| Warehouse   | warehouse01  | Warehouse@123 |

> Module "Kỹ thuật viên" (nhân sự riêng gắn với từng phiếu sửa chữa) đã bị
> loại bỏ — ai đăng nhập được vào Sửa chữa (Admin/Manager/Cashier) đều xử lý
> phiếu trực tiếp, không cần gán kỹ thuật viên.

>  Ở Giai đoạn 3 (Authentication), backend sẽ tự sinh bcrypt hash thật cho các tài khoản này
> qua script/API — không lưu plaintext password trong database.

### 7. Sinh mật khẩu thật cho tài khoản demo (Giai đoạn 3)

Các `PasswordHash` trong `seed.sql` chỉ là placeholder. Sau khi cài backend, chạy:
```bash
cd backend
npm run generate:seed-hashes
```
Script in ra các câu lệnh `UPDATE Users SET PasswordHash = '...' WHERE Username = '...';` —
copy và chạy trong SSMS/Azure Data Studio để tài khoản demo đăng nhập được bằng mật khẩu ở mục 6.

### 8. API xác thực & phân quyền (Giai đoạn 3)

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| POST | `/api/auth/login` | Public | Đăng nhập, trả JWT |
| GET  | `/api/auth/me` | Đã đăng nhập | Thông tin user hiện tại |
| POST | `/api/auth/change-password` | Đã đăng nhập | Tự đổi mật khẩu |
| GET  | `/api/users` | ADMIN | Danh sách người dùng |
| GET  | `/api/users/:id` | ADMIN | Chi tiết người dùng |
| POST | `/api/users` | ADMIN | Tạo người dùng |
| PUT  | `/api/users/:id` | ADMIN | Cập nhật người dùng |
| GET  | `/api/roles` | ADMIN, MANAGER | Danh sách vai trò |

Gửi JWT qua header: `Authorization: Bearer <token>`. Backend luôn tự kiểm tra quyền theo `roleName`
trong token đã ký — frontend không được tự quyết định quyền (đúng mục 17 & 23 tài liệu dự án).

### 9. API mới ở Giai đoạn 4

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/api/categories` | Đã đăng nhập | Danh sách danh mục |
| POST/PUT/DELETE | `/api/categories(/:id)` | ADMIN, MANAGER | Quản lý danh mục |
| GET | `/api/products` | Đã đăng nhập | Danh sách sản phẩm (tìm kiếm, lọc, phân trang) |
| GET | `/api/products/low-stock` | Đã đăng nhập | Sản phẩm sắp hết hàng |
| POST/PUT | `/api/products(/:id)` | ADMIN, MANAGER, WAREHOUSE | Thêm/sửa sản phẩm |
| DELETE | `/api/products/:id` | ADMIN, MANAGER | Ngừng kinh doanh (soft delete) |
| POST | `/api/inventory/import` | ADMIN, MANAGER, WAREHOUSE | Nhập kho (transaction, ghi lịch sử) |
| POST | `/api/inventory/export` | ADMIN, MANAGER, WAREHOUSE | Xuất kho (transaction, chặn âm kho) |
| POST | `/api/inventory/adjust` | ADMIN, MANAGER, WAREHOUSE | Điều chỉnh sau kiểm kê |
| GET | `/api/inventory/transactions` | Đã đăng nhập | Lịch sử giao dịch kho |
| GET | `/api/inventory/low-stock` | Đã đăng nhập | Tổng hợp sản phẩm sắp hết |
| GET/POST/DELETE | `/api/invoice-photos...` | Đã đăng nhập (ghi: ADMIN, MANAGER, WAREHOUSE) | Ảnh hóa đơn nhập hàng theo ngày |

Frontend có 2 trang thật: **Sản phẩm** (đã GỘP chung với "Linh kiện" thành 1 danh mục duy nhất —
dùng chung cho cả bán hàng lẫn sửa chữa) và **Kho hàng** (nhập/xuất/điều chỉnh + lịch sử + cảnh báo
tồn thấp + tab "Đối chiếu hàng nhập" chụp/tải ảnh hóa đơn theo ngày) — dùng chung layout
Sidebar/Header, modal, confirm dialog, toast, loading/empty/error state.

### 10. Module đã loại bỏ

**Nhà cung cấp (Suppliers)**, **Kỹ thuật viên (Technicians)** và **Nhập hàng (PurchaseOrders)**
đã được loại bỏ hoàn toàn khỏi chương trình (không cần thiết cho quy mô cửa hàng hiện tại). Dữ liệu
lịch sử của 3 bảng này KHÔNG bị xóa — chỉ đổi tên thêm hậu tố `_Archived` khi chạy migration 006, xem
`database/migrations/006_merge_products_components.sql`. Thay cho Nhập hàng là chức năng "Đối chiếu
hàng nhập" (ảnh hóa đơn theo ngày) trong trang Kho hàng.

### 11. API mới ở Giai đoạn 6

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/api/customers?all=true` | Đã đăng nhập | Danh sách gọn (dropdown POS) |
| GET | `/api/customers` | Đã đăng nhập | Danh sách phân trang + tìm kiếm |
| GET | `/api/customers/:id/history` | Đã đăng nhập | Lịch sử mua hàng + sửa chữa + tổng chi tiêu + thiết bị |
| POST/PUT/DELETE | `/api/customers(/:id)` | ADMIN, MANAGER, CASHIER (xóa: ADMIN, MANAGER) | CRUD khách hàng |
| GET | `/api/sales` | Đã đăng nhập | Danh sách đơn bán hàng |
| GET | `/api/sales/:id` | Đã đăng nhập | Chi tiết đơn (kèm thanh toán) |
| POST | `/api/sales` | ADMIN, MANAGER, CASHIER | Checkout POS — 1 transaction: tạo đơn + chi tiết + **trừ tồn kho** (chặn âm kho) + ghi `InventoryTransactions` + ghi `Payments` |

Frontend có 2 trang thật: **Khách hàng** (CRUD + modal lịch sử mua hàng/sửa chữa) và **Bán hàng (POS)**
— tìm sản phẩm theo tên/mã, thêm vào giỏ, chỉnh số lượng (giới hạn theo tồn kho), chọn khách hàng
(hoặc khách vãng lai), giảm giá, chọn phương thức thanh toán, thanh toán và xem lại đơn gần đây.

### 12. API mới ở Giai đoạn 7 (module Sửa chữa — quan trọng nhất)

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET/POST/PUT/DELETE | `/api/repair-services...` | Xem: mọi role · Sửa: ADMIN, MANAGER | Bảng giá công sửa chữa |
| GET | `/api/devices?customerId=` | Đã đăng nhập | Thiết bị đã từng sửa của 1 khách hàng |
| GET | `/api/repairs`, `/:id` | Đã đăng nhập | Danh sách / chi tiết phiếu sửa chữa |
| POST | `/api/repairs` | ADMIN, MANAGER, CASHIER | Tiếp nhận xe (tạo thiết bị mới nếu cần — 1 transaction) |
| PUT | `/api/repairs/:id/status` | ADMIN, MANAGER, TECHNICIAN | Cập nhật trạng thái |
| POST/DELETE | `/api/repairs/:id/services(/:detailId)` | ADMIN, MANAGER, TECHNICIAN | Công sửa chữa áp dụng thực tế |
| POST | `/api/repairs/:id/components` | ADMIN, MANAGER, TECHNICIAN | Dùng sản phẩm/linh kiện thực tế — **trừ tồn kho** (transaction, chặn âm kho) |
| DELETE | `/api/repairs/:id/components/:repairComponentId` | ADMIN, MANAGER, TECHNICIAN, WAREHOUSE | Hoàn kho (phiếu hủy / không dùng nữa) — **cộng lại tồn kho** |
| POST | `/api/repairs/:id/payment` | ADMIN, MANAGER, CASHIER | Ghi nhận thanh toán sửa chữa |

Frontend có 1 trang: **Sửa chữa** (danh sách lọc theo trạng thái, modal "Tiếp nhận xe" tạo phiếu mới kèm
thiết bị + ảnh xe lúc nhận, modal chi tiết đầy đủ: đổi trạng thái, thêm công/sản phẩm sử dụng, xác nhận
thanh toán kèm hỏi in hóa đơn). Không còn khái niệm "Kỹ thuật viên" hay "Báo giá" riêng — role TECHNICIAN
vẫn tồn tại trong hệ phân quyền (RBAC) cho người xử lý phiếu, nhưng không còn module quản lý nhân sự
kỹ thuật viên riêng.

### 13. API mới ở Giai đoạn 8 (Reports, Dashboard, Activity Logs)

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|-------|
| GET | `/api/reports/dashboard` | Đã đăng nhập | Toàn bộ dữ liệu trang Dashboard (thẻ thống kê, biểu đồ, danh sách gần đây) trong 1 lần gọi |
| GET | `/api/reports/revenue?startDate&endDate&groupBy=day\|month\|year` | ADMIN, MANAGER | Doanh thu bán hàng + sửa chữa theo thời gian; thêm `&format=csv` để tải CSV |
| GET | `/api/reports/profit` | ADMIN, MANAGER | Lợi nhuận ước tính (doanh thu − giá nhập hiện tại của SP đã bán) |
| GET | `/api/reports/top-products`, `/top-components` | ADMIN, MANAGER | Sản phẩm bán chạy / linh kiện dùng nhiều |
| GET | `/api/reports/inventory` | ADMIN, MANAGER | Tổng số lượng + giá trị tồn kho (sản phẩm, linh kiện) |
| GET | `/api/reports/import-export` | ADMIN, MANAGER | Tổng hợp số giao dịch nhập/xuất/điều chỉnh theo loại |
| GET | `/api/reports/revenue-summary` | ADMIN, MANAGER | Doanh thu bán hàng vs sửa chữa (tổng hợp) |
| GET | `/api/reports/technician-performance` | ADMIN, MANAGER | Hiệu suất toàn bộ kỹ thuật viên |
| GET | `/api/activity-logs` | ADMIN | Nhật ký hệ thống (đăng nhập, CRUD, thay đổi kho, đổi trạng thái sửa chữa, đổi quyền...) |

**Lợi nhuận là ƯỚC TÍNH**: dự án không lưu snapshot giá vốn tại thời điểm bán (để giữ schema đơn giản
cho sinh viên), nên báo cáo lợi nhuận dùng `ImportPrice` HIỆN TẠI của sản phẩm — nếu giá nhập thay đổi
theo thời gian, con số này sẽ lệch so với giá vốn lịch sử thực tế. Đã ghi chú rõ trong `report.service.js`
và ngay trên giao diện Báo cáo.

**Activity Logs** được ghi (fire-and-forget, không làm hỏng response chính nếu ghi log lỗi) tại các hành
động: đăng nhập, tạo/sửa/xóa sản phẩm & linh kiện, nhập/xuất/điều chỉnh kho, tạo phiếu nhập, tạo đơn bán
hàng, tạo/sửa/xóa khách hàng, tiếp nhận phiếu sửa chữa, đổi trạng thái sửa chữa, dùng linh kiện sửa chữa,
tạo/sửa người dùng (bao gồm phát hiện đổi vai trò). Các endpoint ghi khác có thể bổ sung log theo cùng
pattern `logActivity({ userId, action, targetTable, targetId, description })`.

Frontend: **Dashboard** (trang chủ) hiển thị đầy đủ mục 4 tài liệu dự án — thẻ thống kê, biểu đồ doanh thu
14 ngày (recharts LineChart) + biểu đồ bán hàng vs sửa chữa (BarChart), đơn hàng/phiếu sửa chữa gần đây,
cảnh báo tồn kho thấp. **Báo cáo** có bộ lọc theo khoảng ngày, nút xuất CSV doanh thu, và (chỉ ADMIN) bảng
nhật ký hệ thống.

### 14. Giai đoạn 9 — Validation, Security, Error Handling, UI/UX, Responsive

**Bảo mật bổ sung (mục 23):**
- `helmet` — thiết lập HTTP security header cơ bản, ẩn `X-Powered-By`.
- `express-rate-limit` — giới hạn 10 lần thử `/api/auth/login` mỗi 15 phút/IP (chống brute-force mật khẩu),
  và giới hạn chung 1000 request/15 phút/IP cho toàn bộ `/api`.
- CORS chỉ cho phép các origin khai báo trong `ALLOWED_ORIGINS` (biến môi trường) — để trống khi dev,
  **bắt buộc khai báo cụ thể khi triển khai production**.
- Middleware `sanitizeInput` — tự cắt khoảng trắng đầu/cuối mọi chuỗi trong `req.body` trước khi vào validator.
- Giới hạn kích thước request body (2mb) để tránh payload bất thường.
- `pageSize` trên mọi endpoint danh sách bị giới hạn tối đa 100 để tránh truy vấn quá lớn.

**Error Handling bổ sung (mục 20):**
- `errorHandler` giờ phân biệt môi trường: lỗi hệ thống (5xx) ở `NODE_ENV=production` trả thông báo chung
  chung, không lộ chi tiết SQL/stack trace; lỗi nghiệp vụ (4xx từ `ApiError`) vẫn trả message rõ ràng cho
  người dùng. Mọi lỗi đều được log đầy đủ ở console server bất kể môi trường.
- `process.on('unhandledRejection'/'uncaughtException')` ở `server.js` để không crash âm thầm.
- Frontend: axios interceptor tự đăng xuất và chuyển về `/login` khi nhận lỗi 401 (token hết hạn) ở bất kỳ
  request nào (trừ chính request đăng nhập).
- `ErrorBoundary` (React) bắt lỗi render không mong muốn ở bất kỳ trang nào, hiển thị màn hình lỗi thân
  thiện thay vì màn hình trắng.

**UI/UX & Responsive (mục 3):**
- Sidebar giờ responsive thật: ≤768px tự ẩn, mở qua nút hamburger ở Header, trượt vào từ trái kèm lớp phủ
  (overlay) — tự đóng khi chuyển trang hoặc bấm ra ngoài.
- Bảng dữ liệu (`.data-table`) tự cuộn ngang trên màn hình nhỏ thay vì vỡ layout.
- Form nhiều cột (`.form-row`) tự xếp dọc trên mobile; modal co giãn theo chiều rộng màn hình.
- Thẻ thống kê Dashboard tự xếp lại từ 4 cột → 2 cột trên màn hình rất nhỏ.

### 15. Giai đoạn 10 — Testing, Fix bugs, Hoàn thiện README

**Testing:**
- Bộ test đơn vị (`backend/tests/`, dùng `node:test` có sẵn — không cần cài thêm package) cho
  toàn bộ validator, middleware `sanitizeInput`, `ApiError`, `asyncHandler`, và hàm xuất CSV.
  **44/44 test pass.** Chạy bằng `cd backend && npm test`.
- Xem `backend/tests/README.md` để biết phạm vi test hiện tại và hướng dẫn viết test tích hợp
  với SQL Server thật cho các transaction nghiệp vụ (nhập/xuất/bán hàng/sửa chữa) ở bước tiếp theo.

**Fix bugs (rà soát trước khi bàn giao):**
- Đối chiếu toàn bộ chuỗi trạng thái phiếu sửa chữa (`Đã giao khách`, `Đã sửa xong`,
  `Từ chối sửa chữa`...) giữa `schema.sql`, mọi service backend và frontend — khớp tuyệt đối,
  tránh lỗi so sánh chuỗi sai khiến báo cáo/thống kê đếm thiếu.
- Rà soát mọi `require()`/`import` tương đối trong backend và frontend bằng script kiểm tra tự
  động — không có đường dẫn nào bị gãy.
- Xác minh biến dùng trong các lệnh ghi `ActivityLogs` (thêm ở Giai đoạn 8) luôn nằm đúng scope
  hàm chứa nó, không tham chiếu nhầm biến từ handler khác.
- Toàn bộ file JS backend đã qua `node --check`; toàn bộ file JS/JSX frontend đã qua kiểm tra cân
  bằng ngoặc `{}/()/[]` ở mỗi giai đoạn — không phát hiện lỗi cú pháp.

**README:** hoàn thiện với đầy đủ hướng dẫn cài đặt, bảng API theo từng giai đoạn, ghi chú thiết
kế quan trọng (transaction, polymorphic reference, lợi nhuận ước tính...), và checklist trạng thái
bên dưới.

## Trạng thái triển khai — HOÀN THÀNH TOÀN BỘ 10 GIAI ĐOẠN

- [x] Giai đoạn 1: Cấu trúc project, Vite, Express, kết nối SQL Server
- [x] Giai đoạn 2: Thiết kế database, schema.sql, seed.sql
- [x] Giai đoạn 3: Authentication (JWT + bcrypt), User CRUD, Role, phân quyền RBAC
- [x] Giai đoạn 4: Products (đã gộp Components), Categories, Inventory (nhập/xuất/điều chỉnh có transaction)
- [x] Giai đoạn 5: ~~Suppliers, Purchase Orders~~ — đã loại bỏ, thay bằng "Đối chiếu hàng nhập" (ảnh hóa đơn theo ngày) trong Kho hàng
- [x] Giai đoạn 6: Customers, Sales/POS, Payments (transaction giảm kho + thanh toán)
- [x] Giai đoạn 7: Devices, Repair Orders, Repair Services, Repair Components (~~Technicians, Price Quotes~~ đã loại bỏ khỏi luồng sử dụng — xem mục 12)
- [x] Giai đoạn 8: Reports, Dashboard (thật), Activity Logs
- [x] Giai đoạn 9: Validation, Security (helmet, rate limit, CORS), Error Handling, UI/UX, Responsive
- [x] Giai đoạn 10: Testing (44 unit test), Fix bugs, Hoàn thiện README

### 16. Trang Cài đặt (bổ sung theo yêu cầu)

| Tab | Ai thấy | Mô tả |
|---|---|---|
| Đổi mật khẩu | Mọi role | Dùng lại API `/api/auth/change-password` có sẵn từ Giai đoạn 3 |
| Thông tin cửa hàng | Xem: mọi role · Sửa: ADMIN | Tên/địa chỉ/SĐT/email/mã số thuế/logo — bảng mới `StoreSettings` (chỉ 1 dòng, dùng cho hóa đơn sau này) |
| Danh mục sản phẩm | Chỉ ADMIN | CRUD đầy đủ — dùng lại API `/api/categories` đã có từ Giai đoạn 4, trước đây chỉ ẩn trong bộ lọc trang Sản phẩm |
| Bảng giá công sửa chữa | Chỉ ADMIN | CRUD đầy đủ — dùng lại API `/api/repair-services` đã có từ Giai đoạn 7, trước đây chỉ ẩn trong modal báo giá |

**Nếu bạn đã tạo database TRƯỚC KHI có bảng `StoreSettings`**, chạy thêm:
```sql
-- Mở database/migrations/001_add_store_settings.sql trong SSMS và Execute
```
Nếu tạo database MỚI HOÀN TOÀN, chỉ cần chạy `schema.sql` + `seed.sql` như bình thường — bảng
này đã có sẵn trong đó, không cần chạy migration.

## Việc nên làm tiếp theo (ngoài phạm vi bản demo này)

Dự án đã đủ để chạy demo đầy đủ vòng đời nghiệp vụ (nhập hàng → bán hàng/sửa chữa → báo cáo) trên
SQL Server thật. Trước khi dùng cho môi trường thật, nên bổ sung:
- Test tích hợp với SQL Server thật cho các transaction (xem `backend/tests/README.md`).
- Snapshot giá vốn tại thời điểm bán hàng nếu cần báo cáo lợi nhuận chính xác tuyệt đối (hiện tại
  đang dùng giá nhập hiện tại làm giá vốn ước tính — xem ghi chú ở mục 13).
- Kiểm tra "kỹ thuật viên chỉ thao tác trên phiếu được giao cho mình" nếu muốn phân quyền chặt hơn
  mức hiện tại (xem ghi chú trong `repair.routes.js`).
