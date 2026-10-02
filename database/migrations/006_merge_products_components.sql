/* =====================================================================
   Migration 006 — Gộp Linh kiện vào Sản phẩm; gỡ bỏ Nhà cung cấp,
   Kỹ thuật viên, Nhập hàng; thêm bảng ảnh đối chiếu hàng nhập theo ngày.

   CHỈ CẦN CHẠY FILE NÀY nếu bạn đã tạo database từ TRƯỚC. Nếu tạo database
   MỚI HOÀN TOÀN, chỉ cần chạy schema.sql (đã cập nhật theo cấu trúc mới).

   AN TOÀN DỮ LIỆU: các bảng Suppliers, Technicians, PurchaseOrders,
   PurchaseOrderDetails KHÔNG bị xóa — chỉ đổi tên thêm hậu tố "_Archived"
   để giữ lại lịch sử, phòng khi cần tra cứu sau này. Chỉ có bảng Components
   bị xóa hẳn vì toàn bộ dữ liệu của nó đã được chuyển hết sang Products.

   Chạy TOÀN BỘ file này trong 1 lần (không tách khúc) vì có dùng bảng tạm
   #ComponentToProduct xuyên suốt nhiều lệnh.
   ===================================================================== */

USE SalesRepairDB;
GO

/* ---- Bước 0: Bỏ qua nếu đã chạy migration này trước đó ---- */
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Components')
BEGIN

    /* ---- Bước 1: Products cần thêm cột Location (vốn chỉ có ở Components) ---- */
    IF NOT EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('Products') AND name = 'Location')
        ALTER TABLE Products ADD Location NVARCHAR(100) NULL;
    GO

    /* ---- Bước 2: Mỗi ComponentType trở thành 1 Category (nếu chưa có danh mục trùng tên) ---- */
    INSERT INTO Categories (CategoryName)
    SELECT DISTINCT c.ComponentType
    FROM Components c
    WHERE NOT EXISTS (SELECT 1 FROM Categories cat WHERE cat.CategoryName = c.ComponentType);
    GO

    /* ---- Bước 3: Copy toàn bộ Components sang Products, ghi lại bảng ánh xạ
       ComponentID cũ -> ProductID mới (để sửa các bảng tham chiếu ở bước 4) ---- */
    CREATE TABLE #ComponentToProduct (ComponentID INT PRIMARY KEY, ProductID INT NOT NULL);

    MERGE Products AS target
    USING Components AS source
    ON 1 = 0 -- luôn luôn INSERT, không bao giờ khớp UPDATE
    WHEN NOT MATCHED THEN
        INSERT (ProductCode, ProductName, CategoryID, Brand, Model, ImportPrice, SalePrice,
                Quantity, MinStock, Unit, Description, ImageURL, Location, Status, CreatedAt, UpdatedAt)
        VALUES (source.ComponentCode, source.ComponentName,
                (SELECT TOP 1 CategoryID FROM Categories WHERE CategoryName = source.ComponentType),
                source.Brand, source.CompatibleModel, source.ImportPrice, source.SalePrice,
                source.Quantity, source.MinStock, N'Cái', NULL, source.ImageURL, source.Location,
                source.Status, source.CreatedAt, source.UpdatedAt)
    OUTPUT source.ComponentID, inserted.ProductID INTO #ComponentToProduct (ComponentID, ProductID);
    GO

    /* ---- Bước 4: Cập nhật mọi bảng đang tham chiếu ComponentID -> trỏ sang ProductID mới ---- */

    -- 4a. RepairComponents (linh kiện đã dùng trong phiếu sửa chữa)
    UPDATE rc SET rc.ComponentID = m.ProductID
    FROM RepairComponents rc JOIN #ComponentToProduct m ON m.ComponentID = rc.ComponentID;

    ALTER TABLE RepairComponents DROP CONSTRAINT FK_RC_Component;
    ALTER TABLE RepairComponents ADD CONSTRAINT FK_RC_Component FOREIGN KEY (ComponentID) REFERENCES Products(ProductID);
    GO

    -- 4b. InventoryTransactions (lịch sử kho) — đổi luôn ItemType 'COMPONENT' -> 'PRODUCT'
    UPDATE it SET it.ItemID = m.ProductID, it.ItemType = 'PRODUCT'
    FROM InventoryTransactions it JOIN #ComponentToProduct m ON m.ComponentID = it.ItemID AND it.ItemType = 'COMPONENT';
    GO

    -- 4c. PriceQuoteDetails (báo giá cũ, nếu còn dữ liệu lịch sử)
    UPDATE pqd SET pqd.ItemID = m.ProductID, pqd.ItemType = 'PRODUCT'
    FROM PriceQuoteDetails pqd JOIN #ComponentToProduct m ON m.ComponentID = pqd.ItemID AND pqd.ItemType = 'COMPONENT';
    GO

    /* ---- Bước 5: Xóa bảng Components (dữ liệu đã chuyển hết sang Products) ---- */
    DROP TABLE Components;
    DROP TABLE #ComponentToProduct;
    GO

    PRINT N'✅ Đã gộp xong Linh kiện vào Sản phẩm.';
END
ELSE
BEGIN
    PRINT N'ℹ️  Bảng Components không còn tồn tại — có thể đã gộp từ trước, bỏ qua bước gộp.';
END
GO

/* ---- Bước 6: Gỡ Kỹ thuật viên khỏi phiếu sửa chữa (không dùng nữa) ---- */
IF EXISTS (SELECT 1 FROM sys.columns WHERE object_id = OBJECT_ID('RepairOrders') AND name = 'TechnicianID')
BEGIN
    DECLARE @fkName NVARCHAR(200);
    SELECT @fkName = name FROM sys.foreign_keys WHERE parent_object_id = OBJECT_ID('RepairOrders') AND name = 'FK_RO_Technician';
    IF @fkName IS NOT NULL EXEC('ALTER TABLE RepairOrders DROP CONSTRAINT ' + @fkName);
    ALTER TABLE RepairOrders DROP COLUMN TechnicianID;
    PRINT N'✅ Đã gỡ cột TechnicianID khỏi RepairOrders.';
END
GO

/* ---- Bước 7: Archive các bảng không dùng nữa (đổi tên, KHÔNG xóa dữ liệu) ---- */
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Suppliers')
    EXEC sp_rename 'Suppliers', 'Suppliers_Archived';
GO
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'Technicians')
    EXEC sp_rename 'Technicians', 'Technicians_Archived';
GO
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrderDetails')
    EXEC sp_rename 'PurchaseOrderDetails', 'PurchaseOrderDetails_Archived';
GO
IF EXISTS (SELECT 1 FROM sys.tables WHERE name = 'PurchaseOrders')
    EXEC sp_rename 'PurchaseOrders', 'PurchaseOrders_Archived';
GO

/* ---- Bước 8: Bảng ảnh đối chiếu hàng nhập (thay thế chức năng Nhập hàng cũ) ----
   Người dùng chụp/tải ảnh hóa đơn nhập hàng lên, gắn theo ngày — dùng để đối
   chiếu bằng mắt thay vì nhập liệu chi tiết từng dòng hàng như trước. ---- */
IF NOT EXISTS (SELECT 1 FROM sys.tables WHERE name = 'IncomingInvoicePhotos')
BEGIN
    CREATE TABLE IncomingInvoicePhotos (
        PhotoID         INT             IDENTITY(1,1) PRIMARY KEY,
        PhotoDate       DATE            NOT NULL,       -- ngày của hóa đơn/đợt nhập hàng (không phải ngày upload)
        ImageURL        NVARCHAR(500)   NOT NULL,
        Note            NVARCHAR(500)   NULL,
        UploadedBy      INT             NOT NULL,
        CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
        CONSTRAINT FK_IIP_User FOREIGN KEY (UploadedBy) REFERENCES Users(UserID)
    );
    CREATE INDEX IX_IIP_Date ON IncomingInvoicePhotos(PhotoDate);
    PRINT N'✅ Đã tạo bảng IncomingInvoicePhotos.';
END
GO
