import axios from 'axios';

// Instance axios dùng chung cho toàn bộ frontend.
// Mọi service (product.service.js, sales.service.js...) sẽ import từ đây.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  headers: { 'Content-Type': 'application/json' },
});

// Gắn JWT token vào mỗi request.
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Xử lý lỗi tập trung (mục 20: Error Handling):
// - 401 (token hết hạn/không hợp lệ) → tự đăng xuất và chuyển về trang đăng nhập,
//   trừ khi request đó chính là /auth/login (để trang Login tự hiển thị lỗi sai mật khẩu).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isLoginRequest = error.config?.url?.includes('/auth/login');
    if (error.response?.status === 401 && !isLoginRequest) {
      localStorage.removeItem('accessToken');
      localStorage.removeItem('currentUser');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;
