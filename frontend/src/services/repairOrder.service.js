import api from './api.js';

export const getRepairOrders = (params) => api.get('/repairs', { params }).then((res) => res.data.data);
export const getRepairOrder = (id) => api.get(`/repairs/${id}`).then((res) => res.data.data);
export const createRepairOrder = (payload) => api.post('/repairs', payload).then((res) => res.data.data);
export const updateRepairStatus = (id, status, warrantyMonths) => api.put(`/repairs/${id}/status`, { status, warrantyMonths }).then((res) => res.data.data);
export const createPriceQuote = (id, payload) => api.post(`/repairs/${id}/quote`, payload).then((res) => res.data.data);
export const decidePriceQuote = (id, quoteId, decision) => api.put(`/repairs/${id}/quote/${quoteId}/decision`, { decision }).then((res) => res.data.data);
export const addRepairService = (id, payload) => api.post(`/repairs/${id}/services`, payload).then((res) => res.data.data);
export const removeRepairService = (id, detailId) => api.delete(`/repairs/${id}/services/${detailId}`).then((res) => res.data.data);
export const useComponent = (id, payload) => api.post(`/repairs/${id}/components`, payload).then((res) => res.data.data);
export const returnComponent = (id, repairComponentId) => api.delete(`/repairs/${id}/components/${repairComponentId}`).then((res) => res.data.data);
export const addRepairPayment = (id, payload) => api.post(`/repairs/${id}/payment`, payload).then((res) => res.data.data);
