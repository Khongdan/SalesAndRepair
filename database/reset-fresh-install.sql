/* =====================================================================
   reset-fresh-install.sql — XÓA SẠCH và tạo lại database SalesRepairDB
   từ đầu, để cài đặt mới tinh hoặc nạp lại dữ liệu mẫu từ con số 0.

   ⚠️⚠️⚠️ CẢNH BÁO: file này XÓA VĨNH VIỄN toàn bộ dữ liệu hiện có trong
   SalesRepairDB (khách hàng, đơn hàng, phiếu sửa chữa, công nợ...).
   KHÔNG THỂ HOÀN TÁC. Chỉ chạy khi:
     - Mới cài đặt lần đầu và muốn chắc chắn database sạch, HOẶC
     - Đang test/demo và muốn xóa hết để làm lại từ đầu, HOẶC
     - Đã sao lưu (backup) dữ liệu thật cần giữ — xem database/backup/.

   CÁCH DÙNG (đúng thứ tự):
     1. (Nếu có dữ liệu thật cần giữ) Backup trước — xem database/backup/README.md
     2. Chạy file này (reset-fresh-install.sql) để xóa và tạo lại database trắng.
     3. Chạy schema.sql để tạo toàn bộ bảng.
     4. (Tùy chọn) Chạy seed.sql để có dữ liệu mẫu demo/kiểm thử.
   ===================================================================== */

USE master;
GO

IF DB_ID('SalesRepairDB') IS NOT NULL
BEGIN
    -- Ngắt toàn bộ kết nối đang mở tới database (vd: backend đang chạy)
    -- trước khi xóa, nếu không lệnh DROP DATABASE sẽ báo lỗi "đang được sử dụng".
    ALTER DATABASE SalesRepairDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
    DROP DATABASE SalesRepairDB;
    PRINT N'🗑️  Đã xóa database SalesRepairDB cũ.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Chưa có database SalesRepairDB nào — bỏ qua bước xóa.';
END
GO

CREATE DATABASE SalesRepairDB;
GO

PRINT N'✅ Đã tạo database SalesRepairDB mới, trắng tinh.';
PRINT N'   Bước tiếp theo: chạy schema.sql, rồi (tùy chọn) chạy seed.sql.';
GO
