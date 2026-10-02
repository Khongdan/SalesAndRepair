/* =====================================================================
   backup.sql — Sao lưu (backup) toàn bộ database SalesRepairDB.

   File này là T-SQL THUẦN TÚY — không có gì đặc thù cho Windows hay Linux.
   Chạy được trên MỌI hệ điều hành mà SQL Server hỗ trợ (Windows hay
   Linux), theo 1 trong 2 cách:
     - Mở bằng SSMS / Azure Data Studio (GUI) rồi bấm Execute/F5, HOẶC
     - Chạy từ dòng lệnh bằng sqlcmd (có sẵn trên cả Windows lẫn Linux):
         sqlcmd -S <server> -U <user> -P <mật khẩu> -i backup.sql
   → Xem chi tiết câu hỏi "Có bắt buộc dùng SSMS không?" trong README.md
   cùng thư mục này.

   CÁCH DÙNG NHANH (chạy tay 1 lần):
     1. Sửa biến @BackupFolder bên dưới thành thư mục bạn muốn lưu file backup.
        ⚠️ Đường dẫn này áp dụng cho máy đang CHẠY SQL SERVER (không phải máy
        bạn ngồi gõ lệnh) — sửa theo đúng hệ điều hành của máy đó:
          - SQL Server trên Windows: kiểu 'C:\SalesRepairBackups\'
          - SQL Server trên Linux:   kiểu '/var/opt/mssql/backups/'
     2. Chạy (Execute trong SSMS, hoặc qua sqlcmd như trên).

   Để tự động chạy HÀNG NGÀY không cần mở tay:
     - Windows: dùng backup.bat + Task Scheduler
     - Linux/macOS: dùng backup.sh + cron
   Xem hướng dẫn chi tiết trong database/backup/README.md.

   ⚠️ Giá trị @BackupFolder trong file này và giá trị BACKUP_FOLDER trong
   backup.bat/backup.sh nên đặt GIỐNG NHAU — file .sql quyết định SQL Server
   ghi file .bak vào đâu; file .bat/.sh chỉ tạo sẵn thư mục đó và tự xóa
   backup cũ, nên nếu 2 nơi lệch nhau, việc dọn dẹp backup cũ sẽ không đúng
   chỗ.
   ===================================================================== */

DECLARE @BackupFolder NVARCHAR(500) = N'C:\SalesRepairBackups\';   -- ⚠️ Sửa theo máy bạn — xem ví dụ Windows/Linux ở đầu file
DECLARE @DatabaseName NVARCHAR(100) = N'SalesRepairDB';
DECLARE @FileName NVARCHAR(600);
DECLARE @Timestamp NVARCHAR(20) = FORMAT(SYSDATETIME(), 'yyyyMMdd_HHmmss');

SET @FileName = @BackupFolder + @DatabaseName + N'_' + @Timestamp + N'.bak';

BACKUP DATABASE @DatabaseName
TO DISK = @FileName
WITH INIT, CHECKSUM,
     NAME = N'SalesRepairDB - Full Backup',
     DESCRIPTION = N'Sao lưu đầy đủ SalesRepairDB';
-- Ghi chú: không dùng WITH COMPRESSION vì tùy chọn này KHÔNG có trên
-- SQL Server Express (bản miễn phí, phổ biến với cửa hàng nhỏ). Nếu bạn
-- đang dùng SQL Server Standard/Enterprise, có thể thêm ", COMPRESSION"
-- vào dòng WITH ở trên để file backup nhỏ gọn hơn.

PRINT N'✅ Đã sao lưu xong vào: ' + @FileName;
GO
