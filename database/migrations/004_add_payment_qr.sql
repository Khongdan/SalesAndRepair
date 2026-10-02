/* =====================================================================
   Migration 004 — Thêm thông tin QR chuyển khoản (VietQR/MoMo) vào
   StoreSettings, dùng để in mã QR thanh toán trên hóa đơn/phiếu.

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC khi các cột này
   được thêm vào schema.sql chính. Nếu bạn đang tạo database MỚI HOÀN
   TOÀN, chỉ cần chạy schema.sql (đã bao gồm sẵn các cột này).
   ===================================================================== */

USE SalesRepairDB;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('StoreSettings') AND name = 'PaymentQrBankBin'
)
BEGIN
    ALTER TABLE StoreSettings ADD PaymentQrBankBin NVARCHAR(20) NULL;
    PRINT N'✅ Đã thêm cột PaymentQrBankBin vào bảng StoreSettings.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột PaymentQrBankBin đã tồn tại — không cần làm gì thêm.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('StoreSettings') AND name = 'PaymentQrAccountNumber'
)
BEGIN
    ALTER TABLE StoreSettings ADD PaymentQrAccountNumber NVARCHAR(50) NULL;
    PRINT N'✅ Đã thêm cột PaymentQrAccountNumber vào bảng StoreSettings.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột PaymentQrAccountNumber đã tồn tại — không cần làm gì thêm.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('StoreSettings') AND name = 'PaymentQrAccountName'
)
BEGIN
    ALTER TABLE StoreSettings ADD PaymentQrAccountName NVARCHAR(100) NULL;
    PRINT N'✅ Đã thêm cột PaymentQrAccountName vào bảng StoreSettings.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột PaymentQrAccountName đã tồn tại — không cần làm gì thêm.';
END
GO
