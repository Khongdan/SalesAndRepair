import api from './api.js';

export const getActivityLogs = (params) => api.get('/activity-logs', { params }).then((res) => res.data.data);
