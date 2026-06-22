import api from './index.js';

export const getUsers = () => api.get('/users');

export const inviteUser = (data) => api.post('/users/invite', data);

export const updateUserRole = (id, role) => api.patch(`/users/${id}/role`, { role });

export const updateUserStatus = (id, is_active) => api.patch(`/users/${id}/status`, { is_active });

export const deleteUser = (id) => api.delete(`/users/${id}`);

export const getInviteInfo = (token) => api.get(`/users/invite/${token}`);

export const acceptInvite = (token, data) => api.post(`/users/invite/${token}/accept`, data);
