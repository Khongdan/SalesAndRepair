import api from './api.js';

// date dạng 'YYYY-MM-DD'
export const getInvoicePhotosByDate = (date) => api.get('/invoice-photos', { params: { date } }).then((res) => res.data.data);
export const getInvoicePhotoDatesSummary = (params) => api.get('/invoice-photos/summary', { params }).then((res) => res.data.data);
export const createInvoicePhoto = (payload) => api.post('/invoice-photos', payload).then((res) => res.data.data);
export const deleteInvoicePhoto = (id) => api.delete(`/invoice-photos/${id}`).then((res) => res.data.data);
