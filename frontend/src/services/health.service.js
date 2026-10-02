import api from './api.js';

// Gọi API kiểm tra kết nối backend/database — dùng để test setup Giai đoạn 1.
export const checkHealth = () => api.get('/health').then((res) => res.data);
