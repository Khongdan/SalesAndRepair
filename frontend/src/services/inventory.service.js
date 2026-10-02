import api from './api.js';

export const importStock = (payload) => api.post('/inventory/import', payload).then((res) => res.data.data);
export const exportStock = (payload) => api.post('/inventory/export', payload).then((res) => res.data.data);
export const adjustStock = (payload) => api.post('/inventory/adjust', payload).then((res) => res.data.data);
export const getTransactions = (params) => api.get('/inventory/transactions', { params }).then((res) => res.data.data);
export const getLowStockSummary = () => api.get('/inventory/low-stock').then((res) => res.data.data);
