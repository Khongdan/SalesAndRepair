import React from 'react';
import { Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout.jsx';
import Dashboard from './pages/Dashboard/Dashboard.jsx';
import Login from './pages/Login/Login.jsx';
import Products from './pages/Products/Products.jsx';
import Inventory from './pages/Inventory/Inventory.jsx';
import Customers from './pages/Customers/Customers.jsx';
import Sales from './pages/Sales/Sales.jsx';
import Repairs from './pages/Repairs/Repairs.jsx';
import Warranty from './pages/Warranty/Warranty.jsx';
import Reports from './pages/Reports/Reports.jsx';
import Users from './pages/Users/Users.jsx';
import Settings from './pages/Settings/Settings.jsx';
import PublicProduct from './pages/Public/PublicProduct.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminRoute from './components/AdminRoute.jsx';

// Lưu ý cấu trúc trang:
// - "Linh kiện" đã GỘP vào "Sản phẩm" thành 1 danh mục duy nhất — không còn
//   route /components riêng (xem Products.jsx).
// - "Nhà cung cấp", "Kỹ thuật viên", "Nhập hàng" đã được loại bỏ hoàn toàn.
//   Thay cho Nhập hàng là mục "Đối chiếu hàng nhập" nằm trong trang Kho hàng.
//
// Bổ sung route /settings — mọi role đăng nhập đều vào được (tab Đổi mật khẩu +
// xem thông tin cửa hàng), riêng 2 tab quản lý Danh mục/Bảng giá sửa chữa chỉ
// ADMIN mới thấy (tự ẩn trong component Settings, không cần AdminRoute riêng).
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      {/* Trang công khai xem khi quét mã QR — KHÔNG bọc ProtectedRoute vì
          khách hàng không có tài khoản cũng cần mở xem được.
          /scan/components/:code vẫn được backend hỗ trợ (alias) cho các mã QR
          đã in/dán từ trước khi gộp Linh kiện vào Sản phẩm, nên dùng chung
          component PublicProduct cho cả 2 đường dẫn. */}
      <Route path="/scan/products/:code" element={<PublicProduct />} />
      <Route path="/scan/components/:code" element={<PublicProduct />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="customers" element={<Customers />} />
        <Route path="sales" element={<Sales />} />
        <Route path="repairs" element={<Repairs />} />
        <Route path="warranty" element={<Warranty />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<AdminRoute><Users /></AdminRoute>} />
        <Route path="settings" element={<Settings />} />
      </Route>
    </Routes>
  );
}

export default App;
