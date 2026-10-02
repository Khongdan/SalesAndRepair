import React from 'react';
import { NavLink } from 'react-router-dom';
import { getCurrentUser } from '../services/auth.service.js';

// Danh sách menu theo đúng mục 3 (Giao diện tổng thể) trong tài liệu dự án.
// `path: null` = module chưa triển khai (hiển thị nhưng chưa bấm được).
// `adminOnly: true` = chỉ hiện với role ADMIN (vd: Người dùng — quản lý tài khoản/phân quyền).
const MENU_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Bán hàng', path: '/sales' },
  { label: 'Sản phẩm', path: '/products' }, // đã gộp chung với Linh kiện cũ
  { label: 'Kho hàng', path: '/inventory' }, // gồm cả "Đối chiếu hàng nhập" (thay cho Nhập hàng cũ)
  { label: 'Sửa chữa', path: '/repairs' },
  { label: 'Bảo hành', path: '/warranty' },
  { label: 'Khách hàng', path: '/customers' },
  { label: 'Báo cáo', path: '/reports' },
  { label: 'Người dùng', path: '/users', adminOnly: true },
  { label: 'Cài đặt', path: '/settings' },
];

// Responsive: trên mobile, sidebar trượt vào từ trái (class "sidebar-open")
// và có lớp phủ (overlay) để đóng khi bấm ra ngoài.
function Sidebar({ isOpen, onClose }) {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.roleName === 'ADMIN';

  const visibleItems = MENU_ITEMS.filter((item) => !item.adminOnly || isAdmin);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      <aside className={`sidebar ${isOpen ? 'sidebar-open' : ''}`}>
        <div className="sidebar-logo">Sales &amp; Repair</div>
        <nav>
          <ul>
            {visibleItems.map((item) => (
              <li key={item.label}>
                {item.path ? (
                  <NavLink to={item.path} end={item.path === '/'} className={({ isActive }) => (isActive ? 'active' : '')}>
                    {item.label}
                  </NavLink>
                ) : (
                  <span className="menu-disabled" title="Chưa triển khai">{item.label}</span>
                )}
              </li>
            ))}
          </ul>
        </nav>
      </aside>
    </>
  );
}

export default Sidebar;
