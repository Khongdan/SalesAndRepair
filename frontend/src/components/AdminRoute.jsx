import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth.service.js';

/**
 * Chặn truy cập các route chỉ dành cho ADMIN (vd: Người dùng).
 * Đây là bảo vệ ở tầng UI — quyền thật sự luôn được backend kiểm tra lại trên API
 * (route /api/users đã có authorize('ADMIN') ở Giai đoạn 3).
 */
function AdminRoute({ children }) {
  const user = getCurrentUser();
  if (!user || user.roleName !== 'ADMIN') {
    return <Navigate to="/" replace />;
  }
  return children;
}

export default AdminRoute;
