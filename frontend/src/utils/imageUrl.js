// Ghép domain của BACKEND (không phải domain của frontend) vào đường dẫn
// ảnh tương đối server trả về (vd: "/uploads/products/abc.jpg"), để có URL
// đầy đủ hiển thị trong <img src>.
//
// Suy ra domain backend bằng cách bỏ hậu tố "/api" khỏi VITE_API_BASE_URL —
// cách này hoạt động đúng ở mọi môi trường (localhost, IP LAN, domain thật
// khi triển khai) vì không có domain nào bị "hard-code" sẵn.
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';
const BACKEND_ORIGIN = API_BASE_URL.replace(/\/api\/?$/, '');

export function resolveImageUrl(path) {
  if (!path) return '';
  if (/^https?:\/\//i.test(path)) return path; // đã là URL đầy đủ (vd: ảnh cũ trước khi đổi cách lưu)
  return `${BACKEND_ORIGIN}${path.startsWith('/') ? '' : '/'}${path}`;
}
