import api from './api.js';

// Dùng chung instance `api` — endpoint /public/... phía backend không yêu
// cầu đăng nhập nên có/không có token đính kèm đều không ảnh hưởng.
export const getPublicProduct = (code) => api.get(`/public/products/${encodeURIComponent(code)}`).then((res) => res.data.data);
export const getPublicComponent = (code) => api.get(`/public/components/${encodeURIComponent(code)}`).then((res) => res.data.data);
