/* =====================================================================
   SALES & REPAIR MANAGEMENT — DATABASE SCHEMA (Microsoft SQL Server)
   Giai đoạn 2: Thiết kế database

   Quy ước:
   - Mọi bảng có khóa chính IDENTITY (trừ bảng liên kết nhiều-nhiều thuần).
   - Các cột "code" (ProductCode, RepairOrderCode...) là UNIQUE.
   - CHECK constraint đảm bảo số lượng/giá không âm.
   - InventoryTransactions là bảng lịch sử kho trung tâm: mọi thay đổi tồn
     kho (nhập, xuất, điều chỉnh, dùng cho sửa chữa, hoàn kho) đều phải ghi
     vào đây — tồn kho hiện tại vẫn lưu trực tiếp trên Products.Quantity /
     Components.Quantity để truy vấn nhanh, nhưng nghiệp vụ cập nhật số
     lượng PHẢI đi kèm 1 dòng InventoryTransactions trong cùng transaction.
   ===================================================================== */

IF DB_ID('SalesRepairDB') IS NULL
BEGIN
    CREATE DATABASE SalesRepairDB;
END
GO

USE SalesRepairDB;
GO

/* =====================================================================
   1. PHÂN QUYỀN: Roles / Permissions / Users
   ===================================================================== */

CREATE TABLE Roles (
    RoleID          INT             IDENTITY(1,1) PRIMARY KEY,
    RoleName        NVARCHAR(50)    NOT NULL UNIQUE,   -- ADMIN, MANAGER, CASHIER, TECHNICIAN, WAREHOUSE
    Description     NVARCHAR(255)   NULL
);
GO

CREATE TABLE Permissions (
    PermissionID    INT             IDENTITY(1,1) PRIMARY KEY,
    PermissionCode  NVARCHAR(100)   NOT NULL UNIQUE,   -- vd: PRODUCT_CREATE, REPAIR_UPDATE_STATUS
    Description     NVARCHAR(255)   NULL
);
GO

-- Bảng trung gian nhiều-nhiều giữa Role và Permission
CREATE TABLE RolePermissions (
    RoleID          INT NOT NULL,
    PermissionID    INT NOT NULL,
    CONSTRAINT PK_RolePermissions PRIMARY KEY (RoleID, PermissionID),
    CONSTRAINT FK_RolePermissions_Role FOREIGN KEY (RoleID) REFERENCES Roles(RoleID),
    CONSTRAINT FK_RolePermissions_Permission FOREIGN KEY (PermissionID) REFERENCES Permissions(PermissionID)
);
GO

CREATE TABLE Users (
    UserID          INT             IDENTITY(1,1) PRIMARY KEY,
    Username        NVARCHAR(50)    NOT NULL UNIQUE,
    PasswordHash    NVARCHAR(255)   NOT NULL,          -- bcrypt hash, KHÔNG BAO GIỜ lưu plaintext
    FullName        NVARCHAR(100)   NOT NULL,
    Email           NVARCHAR(100)   NULL UNIQUE,
    Phone           NVARCHAR(20)    NULL,
    RoleID          INT             NOT NULL,
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE','INACTIVE')),
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Users_Role FOREIGN KEY (RoleID) REFERENCES Roles(RoleID)
);
GO

/* =====================================================================
   2. DANH MỤC: Categories / Suppliers / Customers / Technicians
   ===================================================================== */

CREATE TABLE Categories (
    CategoryID      INT             IDENTITY(1,1) PRIMARY KEY,
    CategoryName    NVARCHAR(100)   NOT NULL UNIQUE,
    Description     NVARCHAR(255)   NULL
);
GO

/* Lưu ý: Nhà cung cấp (Suppliers), Kỹ thuật viên (Technicians) và Nhập hàng
   (PurchaseOrders/PurchaseOrderDetails) đã được LOẠI BỎ khỏi chương trình —
   không cần thiết cho quy mô cửa hàng hiện tại. Nhập hàng được thay bằng
   chức năng "Đối chiếu hàng nhập qua ảnh hóa đơn" trong Kho hàng (xem bảng
   IncomingInvoicePhotos ở cuối file). Nếu bạn nâng cấp từ bản cũ đã có dữ
   liệu 3 bảng này, xem migrations/006_merge_products_components.sql — dữ
   liệu được ĐỔI TÊN LƯU LẠI (Suppliers_Archived...), không bị xóa.
*/

CREATE TABLE Customers (
    CustomerID      INT             IDENTITY(1,1) PRIMARY KEY,
    CustomerCode    NVARCHAR(20)    NOT NULL UNIQUE,
    FullName        NVARCHAR(100)   NOT NULL,
    Phone           NVARCHAR(20)    NULL UNIQUE,
    Email           NVARCHAR(100)   NULL,
    Address         NVARCHAR(255)   NULL,
    Note            NVARCHAR(500)   NULL,
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME()
);
GO


/* =====================================================================
   3. SẢN PHẨM & LINH KIỆN
   ===================================================================== */

CREATE TABLE Products (
    ProductID       INT             IDENTITY(1,1) PRIMARY KEY,
    ProductCode     NVARCHAR(30)    NOT NULL UNIQUE,
    ProductName     NVARCHAR(150)   NOT NULL,
    CategoryID      INT             NULL,
    Brand           NVARCHAR(100)   NULL,
    Model           NVARCHAR(100)   NULL,               -- đời/model sản phẩm, hoặc "tương thích với model nào" nếu là linh kiện
    ImportPrice     DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (ImportPrice >= 0),
    SalePrice       DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (SalePrice >= 0),
    Quantity        INT             NOT NULL DEFAULT 0 CHECK (Quantity >= 0),
    MinStock        INT             NOT NULL DEFAULT 0 CHECK (MinStock >= 0),
    Unit            NVARCHAR(20)    NOT NULL DEFAULT N'Cái',
    Description     NVARCHAR(1000)  NULL,
    ImageURL        NVARCHAR(500)   NULL,
    Location        NVARCHAR(100)   NULL,               -- vị trí trong kho, vd: Kệ A1 (tùy chọn)
    Status          NVARCHAR(20)    NOT NULL DEFAULT 'ACTIVE' CHECK (Status IN ('ACTIVE','INACTIVE','DISCONTINUED')),
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    UpdatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_Products_Category FOREIGN KEY (CategoryID) REFERENCES Categories(CategoryID)
);
GO

-- Lưu ý: bảng Components (linh kiện) đã được GỘP vào Products ở trên — không
-- còn là 1 bảng riêng nữa. "Loại linh kiện" trước đây (Màn hình, Pin...) giờ
-- quản lý qua Categories như mọi sản phẩm khác, để bán hàng/quản lý kho dùng
-- chung 1 danh sách "Sản phẩm" duy nhất.

/* =====================================================================
   4. KHO: InventoryTransactions (lịch sử nhập/xuất/điều chỉnh tập trung)
   ===================================================================== */

CREATE TABLE InventoryTransactions (
    TransactionID       INT             IDENTITY(1,1) PRIMARY KEY,
    TransactionCode     NVARCHAR(30)    NOT NULL UNIQUE,
    TransactionType      NVARCHAR(20)    NOT NULL
        CHECK (TransactionType IN ('IMPORT','EXPORT','ADJUST','REPAIR_USE','REPAIR_RETURN','SALE')),
    ItemType            NVARCHAR(20)    NOT NULL CHECK (ItemType IN ('PRODUCT')), -- trước có cả 'COMPONENT', nay Linh kiện đã gộp vào Products
    ItemID              INT             NOT NULL,       -- ProductID
    Quantity            INT             NOT NULL CHECK (Quantity > 0),
    PerformedBy         INT             NOT NULL,
    ReferenceType       NVARCHAR(30)    NULL,           -- SALES_ORDER, REPAIR_ORDER...
    ReferenceID         INT             NULL,           -- ID của phiếu liên quan
    TransactionDate     DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    Reason              NVARCHAR(255)   NULL,
    Note                NVARCHAR(500)   NULL,
    CONSTRAINT FK_InvTrans_User FOREIGN KEY (PerformedBy) REFERENCES Users(UserID)
);
GO
CREATE INDEX IX_InvTrans_Item ON InventoryTransactions(ItemType, ItemID);
GO

/* =====================================================================
   5. ĐỐI CHIẾU HÀNG NHẬP: ảnh hóa đơn nhập hàng theo ngày

   Thay cho module "Nhập hàng" (PurchaseOrders) cũ đã bị loại bỏ — thay vì
   nhập liệu chi tiết từng dòng hàng theo nhà cung cấp, cửa hàng chỉ cần
   chụp/tải ảnh hóa đơn nhập hàng lên, gắn theo ngày, rồi tự đối chiếu bằng
   mắt khi cần tra lại. Số lượng tồn kho thực tế vẫn cập nhật qua chức năng
   "Nhập kho" trong Kho hàng (dùng chung InventoryTransactions ở trên).
   ===================================================================== */

CREATE TABLE IncomingInvoicePhotos (
    PhotoID         INT             IDENTITY(1,1) PRIMARY KEY,
    PhotoDate       DATE            NOT NULL,       -- ngày của hóa đơn/đợt nhập hàng (không phải ngày upload)
    ImageURL        NVARCHAR(500)   NOT NULL,
    Note            NVARCHAR(500)   NULL,
    UploadedBy      INT             NOT NULL,
    CreatedAt       DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_IIP_User FOREIGN KEY (UploadedBy) REFERENCES Users(UserID)
);
GO
CREATE INDEX IX_IIP_Date ON IncomingInvoicePhotos(PhotoDate);
GO

/* =====================================================================
   6. BÁN HÀNG: SalesOrders / SalesOrderDetails / Payments
   ===================================================================== */

CREATE TABLE SalesOrders (
    SalesOrderID        INT             IDENTITY(1,1) PRIMARY KEY,
    SalesOrderCode       NVARCHAR(30)    NOT NULL UNIQUE,
    CustomerID           INT             NULL,           -- có thể bán cho khách vãng lai (NULL)
    CreatedBy             INT             NOT NULL,
    OrderDate             DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    TotalAmount          DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (TotalAmount >= 0),
    DiscountAmount        DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (DiscountAmount >= 0),
    FinalAmount           AS (TotalAmount - DiscountAmount) PERSISTED,
    Status                NVARCHAR(20)    NOT NULL DEFAULT 'COMPLETED' CHECK (Status IN ('DRAFT','COMPLETED','CANCELLED','REFUNDED')),
    CONSTRAINT FK_SO_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
    CONSTRAINT FK_SO_User FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
);
GO

CREATE TABLE SalesOrderDetails (
    SalesOrderDetailID   INT             IDENTITY(1,1) PRIMARY KEY,
    SalesOrderID         INT             NOT NULL,
    ProductID             INT             NOT NULL,
    Quantity              INT             NOT NULL CHECK (Quantity > 0),
    UnitPrice             DECIMAL(18,2)   NOT NULL CHECK (UnitPrice >= 0),
    LineTotal             AS (Quantity * UnitPrice) PERSISTED,
    WarrantyMonths        INT             NOT NULL DEFAULT 0 CHECK (WarrantyMonths >= 0), -- số tháng bảo hành áp dụng cho dòng sản phẩm này (0 = không bảo hành)
    WarrantyExpiry         DATETIME2      NULL,        -- tính sẵn tại lúc bán = OrderDate + WarrantyMonths, để tra cứu nhanh không cần join tính toán lại
    CONSTRAINT FK_SOD_SalesOrder FOREIGN KEY (SalesOrderID) REFERENCES SalesOrders(SalesOrderID) ON DELETE CASCADE,
    CONSTRAINT FK_SOD_Product FOREIGN KEY (ProductID) REFERENCES Products(ProductID)
);
GO

CREATE TABLE Payments (
    PaymentID           INT             IDENTITY(1,1) PRIMARY KEY,
    ReferenceType        NVARCHAR(20)    NOT NULL CHECK (ReferenceType IN ('SALES_ORDER','REPAIR_ORDER')),
    ReferenceID           INT             NOT NULL,
    Amount                DECIMAL(18,2)   NOT NULL CHECK (Amount > 0),
    PaymentMethod         NVARCHAR(20)    NOT NULL CHECK (PaymentMethod IN ('CASH','TRANSFER','MIXED')),
    PaymentDate           DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    Note                  NVARCHAR(255)   NULL
);
GO
CREATE INDEX IX_Payments_Reference ON Payments(ReferenceType, ReferenceID);
GO

/* =====================================================================
   7. SỬA CHỮA: Devices / RepairOrders / RepairServices /
      RepairOrderDetails / RepairComponents / PriceQuotes / PriceQuoteDetails
   ===================================================================== */

CREATE TABLE Devices (
    DeviceID            INT             IDENTITY(1,1) PRIMARY KEY,
    CustomerID            INT             NOT NULL,
    DeviceType            NVARCHAR(50)    NOT NULL,      -- Xe máy, Xe đạp, Xe đạp điện...
    Brand                 NVARCHAR(100)   NULL,          -- Hãng xe: Honda, Yamaha, Giant...
    Model                 NVARCHAR(100)   NULL,          -- Dòng xe/đời xe: Wave RSX, Sirius, Exciter...
    IMEI                  NVARCHAR(50)    NULL,          -- Biển số xe hoặc số khung/số máy (không bắt buộc, nhất là xe đạp)
    Note                  NVARCHAR(500)   NULL,
    CONSTRAINT FK_Devices_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID)
);
GO

CREATE TABLE RepairServices (
    RepairServiceID      INT             IDENTITY(1,1) PRIMARY KEY,
    ServiceName           NVARCHAR(150)   NOT NULL,      -- vd: Công thay bố thắng, Công thay nhớt, Công bảo dưỡng
    DefaultPrice          DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (DefaultPrice >= 0),
    Description            NVARCHAR(255)   NULL
);
GO

CREATE TABLE RepairOrders (
    RepairOrderID         INT             IDENTITY(1,1) PRIMARY KEY,
    RepairOrderCode        NVARCHAR(30)    NOT NULL UNIQUE,
    CustomerID              INT             NOT NULL,
    DeviceID                INT             NOT NULL,
    ReceivedDate             DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    ExpectedDate              DATETIME2       NULL,
    CompletedDate             DATETIME2       NULL,
    InitialCondition          NVARCHAR(500)   NULL,        -- tình trạng máy khi nhận
    ReportedIssue              NVARCHAR(500)   NULL,        -- lỗi khách hàng mô tả
    Accessories                NVARCHAR(255)   NULL,        -- phụ kiện đi kèm
    ImageURL                   NVARCHAR(500)   NULL,
    Status                     NVARCHAR(30)    NOT NULL DEFAULT N'Tiếp nhận'
        CHECK (Status IN (
            N'Tiếp nhận', N'Đang kiểm tra', N'Chờ báo giá', N'Chờ khách xác nhận',
            N'Đang sửa', N'Chờ linh kiện', N'Đã sửa xong', N'Đã giao khách',
            N'Từ chối sửa chữa', N'Hủy'
        )),
    Note                        NVARCHAR(500)   NULL,
    WarrantyMonths              INT             NOT NULL DEFAULT 0 CHECK (WarrantyMonths >= 0), -- số tháng bảo hành cho lần sửa này, nhập khi chuyển trạng thái "Đã giao khách"
    WarrantyExpiry               DATETIME2       NULL,       -- tính sẵn = CompletedDate + WarrantyMonths
    CreatedBy                   INT             NOT NULL,
    CONSTRAINT FK_RO_Customer FOREIGN KEY (CustomerID) REFERENCES Customers(CustomerID),
    CONSTRAINT FK_RO_Device FOREIGN KEY (DeviceID) REFERENCES Devices(DeviceID),
    CONSTRAINT FK_RO_User FOREIGN KEY (CreatedBy) REFERENCES Users(UserID)
);
GO

-- Công sửa chữa áp dụng cho 1 phiếu sửa chữa (nhiều dòng dịch vụ)
CREATE TABLE RepairOrderDetails (
    RepairOrderDetailID    INT             IDENTITY(1,1) PRIMARY KEY,
    RepairOrderID            INT             NOT NULL,
    RepairServiceID           INT             NOT NULL,
    Quantity                  INT             NOT NULL DEFAULT 1 CHECK (Quantity > 0),
    UnitPrice                 DECIMAL(18,2)   NOT NULL CHECK (UnitPrice >= 0),
    LineTotal                 AS (Quantity * UnitPrice) PERSISTED,
    CONSTRAINT FK_ROD_RepairOrder FOREIGN KEY (RepairOrderID) REFERENCES RepairOrders(RepairOrderID) ON DELETE CASCADE,
    CONSTRAINT FK_ROD_RepairService FOREIGN KEY (RepairServiceID) REFERENCES RepairServices(RepairServiceID)
);
GO

-- Linh kiện/sản phẩm được sử dụng trong 1 phiếu sửa chữa — mỗi dòng khi ghi
-- phải kèm 1 InventoryTransactions (TransactionType = REPAIR_USE) trừ kho
-- tương ứng. Cột ComponentID trỏ vào Products (đã gộp Linh kiện + Sản phẩm).
CREATE TABLE RepairComponents (
    RepairComponentID       INT             IDENTITY(1,1) PRIMARY KEY,
    RepairOrderID             INT             NOT NULL,
    ComponentID                INT             NOT NULL,   -- = ProductID (xem ghi chú trên)
    Quantity                   INT             NOT NULL CHECK (Quantity > 0),
    UnitPrice                  DECIMAL(18,2)   NOT NULL CHECK (UnitPrice >= 0),
    LineTotal                  AS (Quantity * UnitPrice) PERSISTED,
    IsReturned                 BIT             NOT NULL DEFAULT 0,  -- true nếu đã được hoàn kho
    CONSTRAINT FK_RC_RepairOrder FOREIGN KEY (RepairOrderID) REFERENCES RepairOrders(RepairOrderID) ON DELETE CASCADE,
    CONSTRAINT FK_RC_Component FOREIGN KEY (ComponentID) REFERENCES Products(ProductID)
);
GO

CREATE TABLE PriceQuotes (
    PriceQuoteID           INT             IDENTITY(1,1) PRIMARY KEY,
    RepairOrderID            INT             NOT NULL,
    QuoteDate                 DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    LaborCost                  DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (LaborCost >= 0),
    ComponentCost               DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (ComponentCost >= 0),
    DiscountAmount               DECIMAL(18,2)   NOT NULL DEFAULT 0 CHECK (DiscountAmount >= 0),
    TotalAmount                  AS (LaborCost + ComponentCost - DiscountAmount) PERSISTED,
    CustomerDecision              NVARCHAR(20)    NOT NULL DEFAULT 'PENDING' CHECK (CustomerDecision IN ('PENDING','ACCEPTED','REJECTED')),
    DecisionDate                  DATETIME2       NULL,
    CONSTRAINT FK_PQ_RepairOrder FOREIGN KEY (RepairOrderID) REFERENCES RepairOrders(RepairOrderID)
);
GO

CREATE TABLE PriceQuoteDetails (
    PriceQuoteDetailID      INT             IDENTITY(1,1) PRIMARY KEY,
    PriceQuoteID              INT             NOT NULL,
    ItemType                   NVARCHAR(20)    NOT NULL CHECK (ItemType IN ('SERVICE','PRODUCT')),
    ItemID                      INT             NOT NULL,   -- RepairServiceID hoặc ProductID tùy ItemType
    Quantity                    INT             NOT NULL CHECK (Quantity > 0),
    UnitPrice                   DECIMAL(18,2)   NOT NULL CHECK (UnitPrice >= 0),
    LineTotal                   AS (Quantity * UnitPrice) PERSISTED,
    CONSTRAINT FK_PQD_PriceQuote FOREIGN KEY (PriceQuoteID) REFERENCES PriceQuotes(PriceQuoteID) ON DELETE CASCADE
);
GO

/* =====================================================================
   8. LOG HỆ THỐNG
   ===================================================================== */

CREATE TABLE ActivityLogs (
    ActivityLogID          INT             IDENTITY(1,1) PRIMARY KEY,
    UserID                    INT             NULL,          -- NULL nếu hành động hệ thống
    Action                     NVARCHAR(100)   NOT NULL,       -- LOGIN, CREATE_PRODUCT, UPDATE_REPAIR_STATUS...
    TargetTable                NVARCHAR(100)   NULL,
    TargetID                    INT             NULL,
    Description                 NVARCHAR(500)   NULL,
    CreatedAt                   DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    CONSTRAINT FK_ActivityLogs_User FOREIGN KEY (UserID) REFERENCES Users(UserID)
);
GO

/* =====================================================================
   9. CÀI ĐẶT CỬA HÀNG (bổ sung theo yêu cầu — trang "Cài đặt")

   Chỉ có ĐÚNG 1 dòng (StoreSettingsID = 1) — lưu thông tin hiển thị trên
   hóa đơn bán hàng / phiếu sửa chữa (tên cửa hàng, địa chỉ, SĐT, mã số
   thuế, logo). Không thiết kế nhiều dòng vì hệ thống chỉ phục vụ 1 cửa
   hàng (không phải multi-tenant).
   ===================================================================== */

CREATE TABLE StoreSettings (
    StoreSettingsID     INT             NOT NULL PRIMARY KEY CHECK (StoreSettingsID = 1),
    StoreName           NVARCHAR(150)   NOT NULL DEFAULT N'Cửa hàng của tôi',
    Address             NVARCHAR(255)   NULL,
    Phone               NVARCHAR(20)    NULL,
    Email               NVARCHAR(100)   NULL,
    TaxCode             NVARCHAR(50)    NULL,
    LogoURL             NVARCHAR(500)   NULL,
    -- Thông tin QR chuyển khoản in trên hóa đơn/phiếu (VietQR/MoMo). Để trống
    -- nếu chưa có — hóa đơn sẽ không hiện QR cho tới khi điền đủ 2 mục đầu.
    PaymentQrBankBin       NVARCHAR(20)    NULL, -- mã ngân hàng (BIN) theo chuẩn VietQR, vd '970436'. MoMo cũng có mã riêng trong hệ thống này.
    PaymentQrAccountNumber NVARCHAR(50)    NULL, -- số tài khoản ngân hàng hoặc số điện thoại ví (tùy nơi cấp mã BIN ở trên)
    PaymentQrAccountName   NVARCHAR(100)   NULL, -- tên chủ tài khoản (không dấu, IN HOA theo chuẩn VietQR) — tùy chọn
    -- Ảnh QR nhận thanh toán THẬT do cửa hàng tự tải lên (khuyến nghị dùng
    -- thay cho 3 cột phía trên) — chụp/lưu từ app ngân hàng/MoMo, luôn đúng
    -- 100% vì không qua dịch vụ dựng QR động bên ngoài. Có giá trị này thì
    -- ưu tiên dùng ảnh này, bỏ qua 3 cột BIN/số TK/tên chủ TK ở trên.
    PaymentQrImageURL      NVARCHAR(500)   NULL,
    UpdatedAt           DATETIME2       NOT NULL DEFAULT SYSDATETIME(),
    UpdatedBy           INT             NULL,
    CONSTRAINT FK_StoreSettings_User FOREIGN KEY (UpdatedBy) REFERENCES Users(UserID)
);
GO

/* =====================================================================
   GHI CHÚ QUAN HỆ CHÍNH (đối chiếu mục 16 tài liệu dự án)
   =====================================================================
   Customers → RepairOrders → Devices → RepairComponents → Products → InventoryTransactions
   SalesOrders → SalesOrderDetails → Products → InventoryTransactions
   RepairOrders → PriceQuotes → PriceQuoteDetails
   Kho hàng → IncomingInvoicePhotos (đối chiếu hàng nhập bằng ảnh, thay cho PurchaseOrders cũ)
   ===================================================================== */
