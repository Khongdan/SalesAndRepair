import api from './api.js';

export const getDashboard = () => api.get('/reports/dashboard').then((res) => res.data.data);
export const getRevenueReport = (params) => api.get('/reports/revenue', { params }).then((res) => res.data.data);
export const getProfitReport = (params) => api.get('/reports/profit', { params }).then((res) => res.data.data);
export const getTopProducts = (params) => api.get('/reports/top-products', { params }).then((res) => res.data.data);
export const getTopComponents = (params) => api.get('/reports/top-components', { params }).then((res) => res.data.data);
export const getInventoryReport = () => api.get('/reports/inventory').then((res) => res.data.data);
export const getImportExportReport = (params) => api.get('/reports/import-export', { params }).then((res) => res.data.data);
export const getRevenueSummary = (params) => api.get('/reports/revenue-summary', { params }).then((res) => res.data.data);
export const getDebtReport = () => api.get('/reports/debt').then((res) => res.data.data);

export const downloadDebtCsv = async () => {
  const response = await api.get('/reports/debt', { params: { format: 'csv' }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'cong-no-khach-hang.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Xuất CSV: gọi qua axios instance (có sẵn Authorization header) rồi tự tạo Blob download,
// vì endpoint yêu cầu xác thực nên không thể dùng link tải trực tiếp.
export const downloadRevenueCsv = async (params) => {
  const response = await api.get('/reports/revenue', { params: { ...params, format: 'csv' }, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'doanh-thu-ban-hang.csv');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

// Xuất Excel (.xlsx) tổng hợp toàn bộ báo cáo, nhiều sheet, có style —
// cũng dùng blob download vì endpoint yêu cầu xác thực.
export const downloadReportsXlsx = async (params) => {
  const response = await api.get('/reports/export/xlsx', { params, responseType: 'blob' });
  const url = window.URL.createObjectURL(new Blob([response.data]));
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', 'bao-cao-tong-hop.xlsx');
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};
