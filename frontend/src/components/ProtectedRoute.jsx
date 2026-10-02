import React from 'react';
import { Navigate } from 'react-router-dom';
import { getCurrentUser } from '../services/auth.service.js';

// Chặn truy cập các route cần đăng nhập — chuyển hướng về /login nếu chưa có token.
// Đây là bảo vệ ở tầng UI; quyền thật sự luôn được backend kiểm tra lại trên API.
function ProtectedRoute({ children }) {
  const token = localStorage.getItem('accessToken');
  const user = getCurrentUser();
  if (!token || !user) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;
