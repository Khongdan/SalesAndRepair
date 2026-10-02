/* =====================================================================
   Migration 001 — Thêm bảng StoreSettings (phục vụ trang "Cài đặt")

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC khi bảng
   StoreSettings được thêm vào schema.sql chính. Nếu bạn đang tạo database
   MỚI HOÀN TOÀN, chỉ cần chạy schema.sql (đã bao gồm sẵn bảng này) — không
   cần chạy file migration này nữa.
   ===================================================================== */

USE SalesRepairDB;
GO

IF OBJECT_ID('StoreSettings', 'U') IS NULL
BEGIN
    CREATE TABLE StoreSettings (
        StoreSettingsID     INT             NOT NULL PRIMARY KEY CHECK (StoreSettingsID = 1),
        StoreName           NVARCHAR(150)   NOT NULL DEFAULT N'Cửa hàng của tôi',
        Address             NVARCHAR(255)   NULL,
        Phone               NVARCHAR(20)    NULL,
        Email               NVARCHAR(100)   NULL,
        TaxCode             NVARCHAR(50)    NULL,
        LogoURL             NVARCHAR(500)   NULL,
        UpdatedAt           DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
        UpdatedBy           INT             NULL,
        CONSTRAINT FK_StoreSettings_User FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)
    );

    INSERT INTO StoreSettings (StoreSettingsID, StoreName) VALUES (1, N'Cửa hàng của tôi');

    PRINT N'✅ Đã tạo bảng StoreSettings và dòng mặc định.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Bảng StoreSettings đã tồn tại — không cần làm gì thêm.';
END
GO
