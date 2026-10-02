import api from './api.js';

export const getRoles = () => api.get('/roles').then((res) => res.data.data);
