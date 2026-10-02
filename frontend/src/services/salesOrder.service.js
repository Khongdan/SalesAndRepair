import api from './api.js';

export const getSalesOrders = (params) => api.get('/sales', { params }).then((res) => res.data.data);
export const getSalesOrder = (id) => api.get(`/sales/${id}`).then((res) => res.data.data);
export const createSalesOrder = (payload) => api.post('/sales', payload).then((res) => res.data.data);
export const addSalesPayment = (id, payload) => api.post(`/sales/${id}/payment`, payload).then((res) => res.data.data);
