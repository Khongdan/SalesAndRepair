/* =====================================================================
   restore.sql — Khôi phục database SalesRepairDB từ 1 file backup (.bak).

   File này là T-SQL thuần túy, chạy được trên SQL Server ở cả Windows lẫn
   Linux — mở bằng SSMS/Azure Data Studio, hoặc chạy qua sqlcmd (xem
   README.md cùng thư mục này để rõ hơn về việc có bắt buộc dùng SSMS không).

   DÙNG KHI: máy chủ gặp sự cố (hỏng ổ cứng, cài lại máy, xóa nhầm dữ
   liệu...) và cần khôi phục lại từ bản sao lưu gần nhất.

   CÁCH DÙNG:
     1. Sửa @BackupFile bên dưới thành đường dẫn đầy đủ tới file .bak
        muốn khôi phục (lấy trong thư mục backup, chọn file MỚI NHẤT
        trước thời điểm xảy ra sự cố). ⚠️ Đường dẫn này tính trên máy đang
        CHẠY SQL SERVER — dùng kiểu 'C:\...' nếu SQL Server trên Windows,
        hoặc kiểu '/var/opt/mssql/backups/...' nếu SQL Server trên Linux.
     2. Nếu SalesRepairDB đang tồn tại và bạn muốn GHI ĐÈ hoàn toàn bằng
        bản backup — chạy nguyên file này.
     3. Nếu chỉ muốn xem thử nội dung backup mà KHÔNG ghi đè database
        đang chạy, khôi phục với tên khác (đổi @DatabaseName bên dưới
        thành vd 'SalesRepairDB_Restore_Test') rồi tự đối chiếu dữ liệu.

   ⚠️ LƯU Ý QUAN TRỌNG: Khôi phục sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của
   database đích bằng dữ liệu trong file backup — mọi thay đổi sau thời
   điểm sao lưu sẽ MẤT. Chỉ chạy khi chắc chắn cần thiết.
   ===================================================================== */

DECLARE @BackupFile NVARCHAR(500) = N'C:\SalesRepairBackups\SalesRepairDB_20260101_020000.bak'; -- ⚠️ Sửa lại đường dẫn file backup thực tế
DECLARE @DatabaseName NVARCHAR(100) = N'SalesRepairDB';

-- Ngắt toàn bộ kết nối đang mở tới database trước khi khôi phục
ALTER DATABASE SalesRepairDB SET SINGLE_USER WITH ROLLBACK IMMEDIATE;

RESTORE DATABASE SalesRepairDB
FROM DISK = @BackupFile
WITH REPLACE, RECOVERY;

ALTER DATABASE SalesRepairDB SET MULTI_USER;

PRINT N'✅ Đã khôi phục xong SalesRepairDB từ file: ' + @BackupFile;
GO
