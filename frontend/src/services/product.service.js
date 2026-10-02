import api from './api.js';

export const getProducts = (params) => api.get('/products', { params }).then((res) => res.data.data);
export const getProduct = (id) => api.get(`/products/${id}`).then((res) => res.data.data);
export const getLowStockProducts = () => api.get('/products/low-stock').then((res) => res.data.data);
export const createProduct = (payload) => api.post('/products', payload).then((res) => res.data.data);
export const updateProduct = (id, payload) => api.put(`/products/${id}`, payload).then((res) => res.data.data);
export const deleteProduct = (id) => api.delete(`/products/${id}`).then((res) => res.data.data);
