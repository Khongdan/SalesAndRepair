/* =====================================================================
   Migration 002 — Thêm cột ImageURL cho bảng Components

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC khi cột ImageURL
   được thêm vào schema.sql chính. Nếu bạn đang tạo database MỚI HOÀN
   TOÀN, chỉ cần chạy schema.sql (đã bao gồm sẵn cột này) — không cần
   chạy file migration này nữa.
   ===================================================================== */

USE SalesRepairDB;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('Components') AND name = 'ImageURL'
)
BEGIN
    ALTER TABLE Components ADD ImageURL NVARCHAR(500) NULL;
    PRINT N'✅ Đã thêm cột ImageURL vào bảng Components.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột ImageURL đã tồn tại trong bảng Components — không cần làm gì thêm.';
END
GO
