import api from './api.js';

// Service gọi API xác thực. Token được lưu ở localStorage và tự động
// gắn vào header Authorization bởi interceptor trong api.js.
export async function login(username, password) {
  const res = await api.post('/auth/login', { username, password });
  const { token, user } = res.data.data;
  localStorage.setItem('accessToken', token);
  localStorage.setItem('currentUser', JSON.stringify(user));
  return user;
}

export function logout() {
  localStorage.removeItem('accessToken');
  localStorage.removeItem('currentUser');
}

export function getCurrentUser() {
  const raw = localStorage.getItem('currentUser');
  return raw ? JSON.parse(raw) : null;
}

export async function fetchMe() {
  const res = await api.get('/auth/me');
  return res.data.data;
}

export async function changePassword(oldPassword, newPassword) {
  const res = await api.post('/auth/change-password', { oldPassword, newPassword });
  return res.data;
}
