import api from './index.js';

export const getTanks = () => api.get('/tanks').then((r) => r.data);

export const getTank = (id) => api.get(`/tanks/${id}`).then((r) => r.data);

export const createTank = (data) => api.post('/tanks', data).then((r) => r.data);

export const updateTank = (id, data) => api.put(`/tanks/${id}`, data).then((r) => r.data);

export const deleteTank = (id) => api.delete(`/tanks/${id}`).then((r) => r.data);

export const assignTankBase = (id, data) =>
  api.patch(`/tanks/${id}/assign-base`, data).then((r) => r.data);

export const getTankHistory = (id) =>
  api.get(`/tanks/${id}/history`).then((r) => r.data);
