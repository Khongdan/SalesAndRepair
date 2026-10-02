/* =====================================================================
   SALES & REPAIR MANAGEMENT — SEED DATA
   Dữ liệu mẫu đủ để mở Dashboard và kiểm tra các chức năng chính.

   ⚠️ PasswordHash bên dưới là PLACEHOLDER (không phải bcrypt hash thật).
   Khi triển khai Giai đoạn 3 (Authentication), hãy chạy script Node.js
   dùng bcryptjs để sinh hash thật và UPDATE lại các dòng Users này —
   KHÔNG BAO GIỜ dùng các giá trị placeholder này trong môi trường thật.
   ===================================================================== */

USE SalesRepairDB;
GO

/* =====================================================================
   BẢO VỆ CHỐNG CHẠY NHẦM LẦN 2: nếu database đã có dữ liệu (bảng Roles
   không rỗng — nghĩa là seed.sql đã chạy thành công trước đó), script
   sẽ DỪNG LẠI ở đây (không insert gì thêm) thay vì báo hàng loạt lỗi
   "Violation of UNIQUE KEY constraint" như khi chạy đè lên dữ liệu cũ.

   Muốn nạp lại dữ liệu mẫu từ đầu? Chạy database/reset-fresh-install.sql
   để xóa sạch rồi chạy lại theo đúng thứ tự schema.sql → seed.sql.
   ===================================================================== */
IF EXISTS (SELECT 1 FROM Roles)
BEGIN
    PRINT N'⚠️  Database SalesRepairDB đã có dữ liệu (bảng Roles không rỗng).';
    PRINT N'   Dừng lại, KHÔNG chèn seed data lần nữa để tránh lỗi trùng khóa.';
    PRINT N'   Muốn nạp lại từ đầu? Xem hướng dẫn trong database/reset-fresh-install.sql';
    SET NOEXEC ON;
END
GO

/* ---------- 1. Roles & Permissions ---------- */
INSERT INTO Roles (RoleName, Description) VALUES
(N'ADMIN', N'Toàn quyền hệ thống'),
(N'MANAGER', N'Quản lý bán hàng, kho, sửa chữa, báo cáo'),
(N'CASHIER', N'Bán hàng, khách hàng, xem đơn hàng'),
(N'TECHNICIAN', N'Xử lý phiếu sửa chữa được giao'),
(N'WAREHOUSE', N'Nhập kho, xuất kho, kiểm kê');
GO

INSERT INTO Permissions (PermissionCode, Description) VALUES
('PRODUCT_MANAGE', N'Quản lý sản phẩm'),
('INVENTORY_MANAGE', N'Quản lý kho'),
('SALES_CREATE', N'Tạo đơn bán hàng'),
('REPAIR_MANAGE', N'Quản lý phiếu sửa chữa'),
('REPORT_VIEW', N'Xem báo cáo'),
('USER_MANAGE', N'Quản lý người dùng');
GO

/* ---------- 2. Users (mật khẩu placeholder — xem ghi chú đầu file) ---------- */
INSERT INTO Users (Username, PasswordHash, FullName, Email, Phone, RoleID, Status) VALUES
('admin',       '$2a$10$PLACEHOLDERHASH.ADMIN000000000000000000000000000000', N'Quản trị viên',    'admin@shop.vn',      '0900000001', 1, 'ACTIVE'),
('manager01',   '$2a$10$PLACEHOLDERHASH.MANAGER0000000000000000000000000000', N'Nguyễn Văn Quản',  'manager01@shop.vn',  '0900000002', 2, 'ACTIVE'),
('cashier01',   '$2a$10$PLACEHOLDERHASH.CASHIER0000000000000000000000000000', N'Trần Thị Thu',     'cashier01@shop.vn',  '0900000003', 3, 'ACTIVE'),
('warehouse01', '$2a$10$PLACEHOLDERHASH.WAREHOUSE00000000000000000000000000', N'Phạm Thị Kho',     'warehouse01@shop.vn','0900000005', 5, 'ACTIVE');
GO

/* ---------- 3. Categories ---------- */
-- Dùng chung cho cả sản phẩm lẫn linh kiện (đã gộp làm 1 danh sách "Sản phẩm").
INSERT INTO Categories (CategoryName, Description) VALUES
(N'Xe máy', N'Phụ tùng, linh kiện xe máy các hãng'),
(N'Phụ kiện xe', N'Gương, còi, đèn, dây ga, dây phanh...'),
(N'Xe đạp', N'Phụ tùng, linh kiện xe đạp các hãng');
GO

/* ---------- 4. Customers ---------- */
INSERT INTO Customers (CustomerCode, FullName, Phone, Email, Address) VALUES
('CUS001', N'Nguyễn Văn An', '0912345678', 'an.nguyen@gmail.com', N'12 Trần Hưng Đạo, Q.1, TP.HCM'),
('CUS002', N'Trần Thị Bình', '0923456789', 'binh.tran@gmail.com', N'34 Cách Mạng Tháng 8, Q.3, TP.HCM'),
('CUS003', N'Lê Hoàng Cường', '0934567890', NULL, N'56 Điện Biên Phủ, Bình Thạnh, TP.HCM');
GO

/* ---------- 5. Sản phẩm (đã gộp chung Sản phẩm + Linh kiện thành 1 danh sách) ---------- */
-- SP001-005: hàng "sản phẩm" trước đây. SP006-010: hàng "linh kiện" trước đây
-- (ImportPrice/SalePrice/Location giữ nguyên, "Loại linh kiện" cũ nay quản lý qua CategoryID).
INSERT INTO Products (ProductCode, ProductName, CategoryID, Brand, Model, ImportPrice, SalePrice, Quantity, MinStock, Unit, Description, Location, Status) VALUES
('SP001', N'Lốp xe máy Honda Wave (bộ trước + sau)', 1, 'IRC',   N'Wave, Wave RSX, Wave Alpha', 550000, 750000, 10, 3, N'Bộ', N'Lốp không săm',        NULL, 'ACTIVE'),
('SP002', N'Nhớt động cơ Motul 10W40',              1, 'Motul', N'Dùng chung xe số/tay côn',    85000,  120000, 30, 10, N'Chai', N'Nhớt tổng hợp bán phần', NULL, 'ACTIVE'),
('SP003', N'Bugi NGK',                              1, 'NGK',   N'Dùng chung nhiều dòng xe máy',  25000,  40000, 50, 15, N'Cái', N'Bugi chính hãng',      NULL, 'ACTIVE'),
('SP004', N'Gương xe máy chống chói',               2, 'OEM',   N'Dùng chung nhiều dòng xe',      30000,  55000, 40, 10, N'Cặp', N'Gương chiếu hậu',      NULL, 'ACTIVE'),
('SP005', N'Lốp xe đạp 26 inch',                    3, 'Kenda', N'26 inch - thể thao/địa hình',  120000, 180000, 20, 5, N'Cái', N'Lốp gai địa hình',     NULL, 'ACTIVE'),
('SP006', N'Bố thắng đĩa trước',       1, 'OEM', N'Honda Wave, Wave RSX, Wave Alpha',    60000,  120000, 25, 8, N'Bộ', N'Bố thắng đĩa',            N'Kệ A1', 'ACTIVE'),
('SP007', N'Ắc quy xe máy (bình khô)', 1, 'GS',  N'Dùng chung nhiều dòng xe máy',        250000, 380000, 15, 5, N'Cái', N'Ắc quy khô',              N'Kệ A2', 'ACTIVE'),
('SP008', N'Dây curoa xe ga',          1, 'OEM', N'Honda Air Blade, Vision, Lead',       90000,  150000, 20, 6, N'Cái', N'Dây curoa truyền động',   N'Kệ B1', 'ACTIVE'),
('SP009', N'Bộ nhông sên dĩa',         1, 'DID', N'Yamaha Exciter, Sirius',              320000, 480000, 10, 3, N'Bộ', N'Nhông sên dĩa',           N'Kệ C1', 'ACTIVE'),
('SP010', N'Săm xe đạp 26 inch',       3, 'OEM', N'26 inch - xe đạp phổ thông/địa hình', 25000,  45000,  30, 10, N'Cái', N'Săm xe đạp',              N'Kệ A3', 'ACTIVE');
GO

/* ---------- 6. Repair Services (bảng giá công sửa chữa) ---------- */
INSERT INTO RepairServices (ServiceName, DefaultPrice, Description) VALUES
(N'Công thay bố thắng', 100000, N'Công tháo lắp, thay bố thắng trước/sau'),
(N'Công thay nhớt', 30000, N'Công thay nhớt động cơ, kiểm tra rò rỉ'),
(N'Công bảo dưỡng định kỳ', 80000, N'Vệ sinh, tra dầu mỡ, siết ốc tổng quát'),
(N'Công kiểm tra tổng quát', 0, N'Miễn phí kiểm tra ban đầu');
GO

/* ---------- 7. Nhập kho mẫu (đối chiếu bằng ảnh hóa đơn ở IncomingInvoicePhotos,
   số lượng tồn cập nhật trực tiếp qua InventoryTransactions IMPORT) ---------- */
INSERT INTO InventoryTransactions (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, Reason) VALUES
('TX0001', 'IMPORT', 'PRODUCT', 6, 1, 5, N'Nhập bổ sung bố thắng'),
('TX0002', 'IMPORT', 'PRODUCT', 7, 1, 5, N'Nhập bổ sung ắc quy'),
('TX0003', 'IMPORT', 'PRODUCT', 8, 2, 5, N'Nhập bổ sung dây curoa x2');
GO

/* ---------- 8. Sales Order mẫu (bán hàng) ---------- */
INSERT INTO SalesOrders (SalesOrderCode, CustomerID, CreatedBy, TotalAmount, DiscountAmount, Status)
VALUES ('SO0001', 1, 3, 750000, 0, 'COMPLETED');
GO

INSERT INTO SalesOrderDetails (SalesOrderID, ProductID, Quantity, UnitPrice) VALUES
(1, 1, 1, 750000); -- 1x Lốp xe máy Honda Wave (bộ trước + sau)
GO

INSERT INTO InventoryTransactions (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason) VALUES
('TX0004', 'SALE', 'PRODUCT', 1, 1, 3, 'SALES_ORDER', 1, N'Bán hàng theo SO0001');
GO

UPDATE Products SET Quantity = Quantity - 1 WHERE ProductID = 1;
GO

INSERT INTO Payments (ReferenceType, ReferenceID, Amount, PaymentMethod, Note) VALUES
('SALES_ORDER', 1, 750000, 'TRANSFER', N'Thanh toán đủ qua chuyển khoản');
GO

/* ---------- 9. Repair Order mẫu (sửa chữa) ---------- */
-- Model = dòng xe/đời xe (vd: Wave RSX, Sirius, Exciter...)
-- IMEI  = tái sử dụng làm biển số xe / số khung-số máy (không bắt buộc, nhất là xe đạp)
INSERT INTO Devices (CustomerID, DeviceType, Brand, Model, IMEI, Note) VALUES
(2, N'Xe máy', 'Honda', 'Wave RSX', '59-P1 123.45', N'Xe bị kêu lạch cạch, phanh trước không ăn');
GO

INSERT INTO RepairOrders
    (RepairOrderCode, CustomerID, DeviceID, ExpectedDate, InitialCondition, ReportedIssue, Accessories, Status, CreatedBy)
VALUES
    ('RO0001', 2, 1, DATEADD(DAY, 2, SYSDATETIME()), N'Xe còn nguyên vẹn, bố thắng trước đã mòn',
     N'Khách báo phanh trước không ăn, có tiếng kêu lạ khi phanh', N'Không có phụ kiện đi kèm', N'Đang sửa', 2);
GO

-- Công sửa chữa & sản phẩm/linh kiện đã gắn thực tế vào phiếu
INSERT INTO RepairOrderDetails (RepairOrderID, RepairServiceID, Quantity, UnitPrice) VALUES
(1, 1, 1, 100000); -- Công thay bố thắng
GO

INSERT INTO RepairComponents (RepairOrderID, ComponentID, Quantity, UnitPrice) VALUES
(1, 6, 1, 120000); -- Dùng 1 bố thắng đĩa trước (SP006)
GO

INSERT INTO InventoryTransactions (TransactionCode, TransactionType, ItemType, ItemID, Quantity, PerformedBy, ReferenceType, ReferenceID, Reason) VALUES
('TX0005', 'REPAIR_USE', 'PRODUCT', 6, 1, 3, 'REPAIR_ORDER', 1, N'Dùng bố thắng cho phiếu sửa chữa RO0001');
GO

UPDATE Products SET Quantity = Quantity - 1 WHERE ProductID = 6;
GO

/* ---------- 10. Activity Logs mẫu ---------- */
INSERT INTO ActivityLogs (UserID, Action, TargetTable, TargetID, Description) VALUES
(1, 'LOGIN', NULL, NULL, N'Admin đăng nhập hệ thống'),
(3, 'CREATE_SALES_ORDER', 'SalesOrders', 1, N'Tạo đơn bán hàng SO0001'),
(2, 'CREATE_REPAIR_ORDER', 'RepairOrders', 1, N'Tiếp nhận phiếu sửa chữa RO0001');
GO

/* ---------- 11. Store Settings (mặc định — sửa trong trang Cài đặt) ---------- */
INSERT INTO StoreSettings (StoreSettingsID, StoreName, Address, Phone, Email, TaxCode)
VALUES (1, N'Cửa hàng Phụ Tùng & Sửa Xe ABC', N'123 Nguyễn Trãi, Q.1, TP.HCM', '0281234567', 'contact@abcshop.vn', '0312345678');
GO

PRINT N'✅ Seed data đã được chèn thành công.';
GO

SET NOEXEC OFF;
GO
