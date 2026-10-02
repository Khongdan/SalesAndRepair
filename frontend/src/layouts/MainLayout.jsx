import React, { useState } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import Sidebar from '../components/Sidebar.jsx';
import Header from '../components/Header.jsx';

// Layout tổng thể: Sidebar bên trái + Header phía trên + nội dung chính ở giữa.
// Responsive: trên màn hình nhỏ, Sidebar ẩn mặc định và mở qua nút hamburger ở Header.
function MainLayout() {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const location = useLocation();

  // Tự đóng menu mobile mỗi khi chuyển trang.
  React.useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  return (
    <div className="app-shell">
      <Sidebar isOpen={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />
      <div className="app-main">
        <Header onToggleMenu={() => setMobileNavOpen((v) => !v)} />
        <main className="app-content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

export default MainLayout;
