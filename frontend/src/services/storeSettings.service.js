import api from './api.js';

export const getStoreSettings = () => api.get('/store-settings').then((res) => res.data.data);
export const updateStoreSettings = (payload) => api.put('/store-settings', payload).then((res) => res.data.data);
