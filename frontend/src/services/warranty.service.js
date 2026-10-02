import api from './api.js';

export const searchWarranty = (q) => api.get('/warranty/search', { params: { q } }).then((res) => res.data.data);

export const getExpiringWarranties = (params) => api.get('/warranty/expiring', { params }).then((res) => res.data.data);

// Xuất CSV danh sách bảo hành sắp hết hạn — dùng axios (có sẵn Authorization header)
// rồi tự tạo Blob download, giống các báo cáo khác.
export const downloadExpiringWarrantiesCsv = async (params) => {
  const response = await api.get('/warranty/expiring', { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'bao-hanh-sap-het-han.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
