import api from './api.js';

export const getDevicesByCustomer = (customerId) => api.get('/devices', { params: { customerId } }).then((res) => res.data.data);
