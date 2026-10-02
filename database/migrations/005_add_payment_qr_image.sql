/* =====================================================================
   Migration 005 — Thêm cột PaymentQrImageURL vào StoreSettings.

   Cho phép cửa hàng tải lên SẴN 1 ảnh mã QR nhận thanh toán thật (chụp/lưu
   từ app ngân hàng hoặc MoMo) thay vì phải điền mã BIN ngân hàng + số tài
   khoản để hệ thống tự dựng QR động qua dịch vụ bên ngoài (cách cũ dễ lỗi
   nếu điền sai mã BIN hoặc dịch vụ bên ngoài không ổn định).

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC khi cột này được
   thêm vào schema.sql chính. Nếu bạn đang tạo database MỚI HOÀN TOÀN, chỉ
   cần chạy schema.sql (đã bao gồm sẵn cột này).
   ===================================================================== */

USE SalesRepairDB;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('StoreSettings') AND name = 'PaymentQrImageURL'
)
BEGIN
    ALTER TABLE StoreSettings ADD PaymentQrImageURL NVARCHAR(500) NULL;
    PRINT N'✅ Đã thêm cột PaymentQrImageURL vào bảng StoreSettings.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột PaymentQrImageURL đã tồn tại — không cần làm gì thêm.';
END
GO
