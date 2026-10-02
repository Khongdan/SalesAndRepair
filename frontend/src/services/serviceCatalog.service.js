import api from './api.js';

export const getRepairServices = () => api.get('/repair-services').then((res) => res.data.data);
export const createRepairService = (payload) => api.post('/repair-services', payload).then((res) => res.data.data);
export const updateRepairService = (id, payload) => api.put(`/repair-services/${id}`, payload).then((res) => res.data.data);
export const deleteRepairService = (id) => api.delete(`/repair-services/${id}`).then((res) => res.data.data);
