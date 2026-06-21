import api from './index.js';

export const getQualityChecks = (params) =>
  api.get('/quality-checks', { params }).then((r) => r.data);

export const createQualityCheck = (data) =>
  api.post('/quality-checks', data).then((r) => r.data);

export const updateQualityCheck = (id, data) =>
  api.put(`/quality-checks/${id}`, data).then((r) => r.data);
