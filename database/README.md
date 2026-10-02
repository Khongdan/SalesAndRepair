# Database — SalesRepairDB

## Cách chạy — cài đặt mới hoàn toàn (chưa có database)

1. Mở **SSMS** (SQL Server Management Studio) hoặc **Azure Data Studio**, kết nối tới SQL Server instance.
2. Mở và chạy `schema.sql` — script sẽ tự tạo database `SalesRepairDB` (nếu chưa có) và toàn bộ bảng.
3. (Tùy chọn, chỉ để có dữ liệu demo/kiểm thử) Mở và chạy `seed.sql` — chèn dữ liệu mẫu (role, user, sản phẩm, linh kiện, đơn hàng, phiếu sửa chữa mẫu...).
4. Chạy các file trong `migrations/` **theo đúng thứ tự số** (`001_...` → `002_...` → ...) — mỗi file tự kiểm tra và bỏ qua nếu phần đó đã có sẵn trong `schema.sql`, nên chạy thừa cũng không lỗi.
5. Kiểm tra nhanh:
   ```sql
   USE SalesRepairDB;
   SELECT * FROM Products;
   SELECT * FROM RepairOrders;
   ```

⚠️ **`schema.sql` và `seed.sql` chỉ nên chạy 1 LẦN trên database rỗng.** Chạy
lại `seed.sql` trên database đã có dữ liệu sẽ tự dừng và in cảnh báo (không
còn báo lỗi đỏ tràn màn hình nữa) — xem mục "Xử lý sự cố" bên dưới nếu vẫn
gặp lỗi.

## Muốn xóa sạch làm lại từ đầu?

Dùng `reset-fresh-install.sql` ở thư mục gốc `database/` — file này **xóa
vĩnh viễn** database `SalesRepairDB` hiện tại rồi tạo lại database trắng.
Chạy xong file đó thì quay lại làm theo 5 bước "Cách chạy" ở trên (từ bước 2).
⚠️ Backup trước nếu trong database đang có dữ liệu thật cần giữ (xem
[`backup/README.md`](./backup/README.md)).

## Xử lý sự cố thường gặp

**Lỗi `Violation of UNIQUE KEY constraint` khi chạy `seed.sql`:** database
của bạn đã có dữ liệu từ trước (đã chạy `seed.sql` rồi, giờ chạy lại lần
nữa). Đây không phải lỗi thật — chỉ cần bỏ qua, không cần chạy `seed.sql`
lại nữa. Muốn nạp lại dữ liệu mẫu từ đầu, dùng `reset-fresh-install.sql`
như hướng dẫn ở trên.

**Lỗi `Incorrect syntax near '<<'` hoặc gần `'='`, `'>>'`:** đây là dấu hiệu
file `.sql` bị dính **ký tự merge-conflict** (`<<<<<<<`, `=======`,
`>>>>>>>`) — thường xảy ra khi copy-paste/gộp thủ công nhiều bản file khác
nhau vào cùng 1 file. Cách xử lý: xóa file `.sql` đang dùng, tải lại nguyên
vẹn file gốc trong bộ mã nguồn mới nhất, và chạy thẳng file đó — **không
copy-paste/chỉnh sửa tay vào file trước khi chạy**.

## Danh sách bảng

| Nhóm | Bảng |
|------|------|
| Phân quyền | `Roles`, `Permissions`, `RolePermissions`, `Users` |
| Danh mục | `Categories`, `Suppliers`, `Customers`, `Technicians` |
| Sản phẩm / Linh kiện | `Products`, `Components` |
| Kho | `InventoryTransactions` |
| Nhập hàng | `PurchaseOrders`, `PurchaseOrderDetails` |
| Bán hàng | `SalesOrders`, `SalesOrderDetails`, `Payments` |
| Sửa chữa | `Devices`, `RepairServices`, `RepairOrders`, `RepairOrderDetails`, `RepairComponents`, `PriceQuotes`, `PriceQuoteDetails` |
| Hệ thống | `ActivityLogs` |

## Nguyên tắc thiết kế quan trọng

- **Tồn kho không được âm**: mọi cột `Quantity` trên `Products`, `Components` đều có `CHECK (Quantity >= 0)`.
  Nghiệp vụ backend (Giai đoạn 4+) phải kiểm tra tồn kho đủ trước khi trừ, và bọc trong `TRANSACTION`.
- **`InventoryTransactions` là nguồn sự thật cho lịch sử kho** — mọi thay đổi số lượng (nhập/xuất/bán/dùng
  cho sửa chữa/hoàn kho) đều phải ghi 1 dòng vào đây, cùng transaction với việc `UPDATE` số lượng trên
  `Products`/`Components`.
- **`ItemType` + `ItemID`** trong `InventoryTransactions`, `PurchaseOrderDetails`, `PriceQuoteDetails` dùng
  polymorphic reference (thay vì 2 cột FK riêng) để 1 bảng có thể tham chiếu tới `Products` hoặc `Components`.
  Đây là lựa chọn đơn giản, dễ hiểu cho dự án sinh viên — backend cần tự validate `ItemID` tồn tại theo đúng `ItemType`.
- **Các cột tính toán (`LineTotal`, `FinalAmount`, `TotalAmount` trong `PriceQuotes`)** dùng
  `AS (...) PERSISTED` để SQL Server tự tính và lưu, tránh sai lệch dữ liệu.
- **Trạng thái phiếu sửa chữa** (`RepairOrders.Status`) dùng `CHECK` với đúng 10 trạng thái theo mục 11
  tài liệu dự án (bao gồm cả "Từ chối sửa chữa" theo mục 12).

## Sao lưu & khôi phục dữ liệu

⚠️ **Quan trọng**: xem hướng dẫn sao lưu định kỳ (tự động mỗi ngày) và khôi
phục dữ liệu tại [`backup/README.md`](./backup/README.md). Nên thiết lập
ngay sau khi triển khai, tránh mất dữ liệu khi máy chủ gặp sự cố.

## Việc còn lại ở các giai đoạn sau

- Stored procedures / transaction xử lý nghiệp vụ (bán hàng, nhập kho, dùng linh kiện sửa chữa) sẽ được
  viết ở tầng backend (Node.js + `mssql`, dùng `sql.Transaction`) ở Giai đoạn 4 trở đi, không viết seed data
  giả lập nghiệp vụ phức tạp trong file `.sql` thuần.
- Bảng `Permissions`/`RolePermissions` mới có cấu trúc — dữ liệu phân quyền chi tiết theo từng permission
  sẽ được hoàn thiện ở Giai đoạn 3 (Authentication/Authorization).
