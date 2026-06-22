import api from './index.js';

export const getTankLoads = (params) =>
  api.get('/tank-loads', { params }).then((r) => r.data);

export const createTankLoad = (data) => api.post('/tank-loads', data).then((r) => r.data);

export const deleteTankLoad = (id) => api.delete(`/tank-loads/${id}`).then((r) => r.data);
