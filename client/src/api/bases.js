import api from './index.js';

export const getBases = () => api.get('/bases').then((r) => r.data);

export const createBase = (data) => api.post('/bases', data).then((r) => r.data);

export const updateBase = (id, data) => api.put(`/bases/${id}`, data).then((r) => r.data);

export const deleteBase = (id) => api.delete(`/bases/${id}`).then((r) => r.data);
