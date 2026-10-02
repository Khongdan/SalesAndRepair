import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Upload 1 file ảnh lên server, trả về URL đầy đủ để hiển thị/lưu.
 * Dùng axios trực tiếp (không dùng instance `api` dùng chung) vì instance đó
 * ép sẵn header Content-Type: application/json cho mọi request — nếu dùng
 * lại thì phải ghi đè, dễ làm hỏng boundary của multipart/form-data.
 *
 * @param {File} file - File ảnh người dùng chọn từ thư viện hoặc chụp trực tiếp
 * @param {'products'|'components'|'repairs'} target - Loại ảnh để gọi đúng endpoint
 * @returns {Promise<string>} URL ảnh đã upload
 */
export async function uploadImage(file, target) {
  const endpointByTarget = {
    products: '/uploads/products/image',
    components: '/uploads/components/image',
    repairs: '/uploads/repairs/image',
  };
  const endpoint = endpointByTarget[target] || endpointByTarget.products;
  const formData = new FormData();
  formData.append('image', file);

  const token = localStorage.getItem('accessToken');
  const res = await axios.post(`${API_BASE_URL}${endpoint}`, formData, {
    headers: {
      Authorization: token ? `Bearer ${token}` : undefined,
    },
  });
  return res.data.data.url;
}
