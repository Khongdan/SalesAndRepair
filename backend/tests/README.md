# Backend Tests

Bộ test dùng **`node:test`** (test runner có sẵn trong Node.js ≥ 18) — không cần cài thêm
package nào để chạy các test này.

## Chạy test

```bash
cd backend
npm test
```

Tương đương với `node --test` — tự động tìm mọi file `*.test.js` trong thư mục `tests/`.

## Phạm vi test hiện tại

Các test hiện có chỉ kiểm tra **logic thuần túy, không phụ thuộc SQL Server**, để chạy được
ngay cả khi chưa cấu hình database:

| Thư mục | Kiểm tra |
|---|---|
| `tests/utils/apiError.test.js` | Lớp `ApiError` giữ đúng status/message/errors; `asyncHandler` forward lỗi ra `next()` đúng cách |
| `tests/utils/csv.test.js` | Hàm `toCsv()` — escape dấu phẩy/ngoặc kép/xuống dòng, xử lý null/undefined |
| `tests/middleware/sanitize.test.js` | Middleware `sanitizeInput` trim khoảng trắng đệ quy (object lồng nhau, mảng) |
| `tests/validators/auth.validator.test.js` | Validate đăng nhập, đổi mật khẩu |
| `tests/validators/product.validator.test.js` | Validate tạo/sửa sản phẩm — đặc biệt các ràng buộc giá/số lượng không âm |
| `tests/validators/inventory.validator.test.js` | Validate nhập/xuất/điều chỉnh kho — bao gồm case `newQuantity = 0` phải được chấp nhận (kiểm kê về 0 khác với "thiếu giá trị") |
| `tests/validators/repairOrder.validator.test.js` | Validate luồng tạo phiếu sửa chữa, báo giá, quyết định báo giá, dùng linh kiện |

**44 test, tất cả đang pass.**

## Việc còn lại: test tích hợp với database thật

Các service (`product.service.js`, `inventory.service.js`, `salesOrder.service.js`,
`repairOrder.service.js`...) chứa logic nghiệp vụ quan trọng nhất của dự án — đặc biệt các
transaction chống âm kho. Test các service này cần một SQL Server thật (hoặc SQL Server
chạy trong Docker/LocalDB dành riêng cho test) vì chúng gọi trực tiếp `mssql`.

Gợi ý triển khai ở bước tiếp theo (ngoài phạm vi bản demo này):
1. Tạo database test riêng (`SalesRepairDB_Test`), chạy `schema.sql` vào đó.
2. Dùng `supertest` để gọi thẳng vào Express `app` (export `app` từ `server.js` thay vì chỉ gọi
   `app.listen()` ngay trong file, để test import được).
3. Viết test tích hợp cho các luồng transaction quan trọng nhất trước:
   - `POST /api/inventory/export` khi tồn kho không đủ → phải trả lỗi 400 và **không** trừ kho.
   - `POST /api/sales` với sản phẩm hết hàng → toàn bộ đơn phải rollback, không tạo `SalesOrders`
     "mồ côi" (không có `SalesOrderDetails`).
   - `POST /api/repairs/:id/components` rồi `DELETE .../:repairComponentId` → tồn kho phải quay
     về đúng số lượng ban đầu.
4. Dọn dữ liệu test sau mỗi lần chạy (transaction rollback thủ công hoặc `TRUNCATE` theo thứ tự
   khóa ngoại) để test độc lập, chạy lại được nhiều lần.
