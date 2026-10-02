import api from './api.js';

export const getCustomers = (params) => api.get('/customers', { params }).then((res) => res.data.data);
export const getAllCustomers = () => api.get('/customers', { params: { all: true } }).then((res) => res.data.data);
export const getCustomer = (id) => api.get(`/customers/${id}`).then((res) => res.data.data);
export const getCustomerHistory = (id) => api.get(`/customers/${id}/history`).then((res) => res.data.data);
export const createCustomer = (payload) => api.post('/customers', payload).then((res) => res.data.data);
export const updateCustomer = (id, payload) => api.put(`/customers/${id}`, payload).then((res) => res.data.data);
export const deleteCustomer = (id) => api.delete(`/customers/${id}`).then((res) => res.data.data);
