/* =====================================================================
   Migration 003 — Thêm chức năng lưu thông tin bảo hành

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC khi các cột
   bảo hành được thêm vào schema.sql chính. Nếu bạn đang tạo database
   MỚI HOÀN TOÀN, chỉ cần chạy schema.sql (đã bao gồm sẵn các cột này).

   - SalesOrderDetails.WarrantyMonths / WarrantyExpiry: bảo hành theo
     từng dòng sản phẩm đã bán (mỗi sản phẩm có thể có thời hạn khác nhau).
   - RepairOrders.WarrantyMonths / WarrantyExpiry: bảo hành cho lần sửa
     chữa, nhập khi kỹ thuật viên/lễ tân chuyển trạng thái "Đã giao khách".
   ===================================================================== */

USE SalesRepairDB;
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('SalesOrderDetails') AND name = 'WarrantyMonths'
)
BEGIN
    ALTER TABLE SalesOrderDetails ADD WarrantyMonths INT NOT NULL DEFAULT 0 CHECK (WarrantyMonths >= 0);
    PRINT N'✅ Đã thêm cột WarrantyMonths vào bảng SalesOrderDetails.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột WarrantyMonths đã tồn tại trong bảng SalesOrderDetails — không cần làm gì thêm.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('SalesOrderDetails') AND name = 'WarrantyExpiry'
)
BEGIN
    ALTER TABLE SalesOrderDetails ADD WarrantyExpiry DATETIME2 NULL;
    PRINT N'✅ Đã thêm cột WarrantyExpiry vào bảng SalesOrderDetails.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột WarrantyExpiry đã tồn tại trong bảng SalesOrderDetails — không cần làm gì thêm.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RepairOrders') AND name = 'WarrantyMonths'
)
BEGIN
    ALTER TABLE RepairOrders ADD WarrantyMonths INT NOT NULL DEFAULT 0 CHECK (WarrantyMonths >= 0);
    PRINT N'✅ Đã thêm cột WarrantyMonths vào bảng RepairOrders.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột WarrantyMonths đã tồn tại trong bảng RepairOrders — không cần làm gì thêm.';
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.columns
    WHERE object_id = OBJECT_ID('RepairOrders') AND name = 'WarrantyExpiry'
)
BEGIN
    ALTER TABLE RepairOrders ADD WarrantyExpiry DATETIME2 NULL;
    PRINT N'✅ Đã thêm cột WarrantyExpiry vào bảng RepairOrders.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Cột WarrantyExpiry đã tồn tại trong bảng RepairOrders — không cần làm gì thêm.';
END
GO
