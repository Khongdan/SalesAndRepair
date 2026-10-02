import api from './api.js';

export const getUsers = (params) => api.get('/users', { params }).then((res) => res.data.data);
export const getUser = (id) => api.get(`/users/${id}`).then((res) => res.data.data);
export const createUser = (payload) => api.post('/users', payload).then((res) => res.data.data);
export const updateUser = (id, payload) => api.put(`/users/${id}`, payload).then((res) => res.data.data);
