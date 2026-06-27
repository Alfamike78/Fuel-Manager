import api from './index.js';

export const getOperations = (params = {}) =>
  api.get('/fueling-operations', { params }).then((r) => r.data);

export const getOperation = (id) =>
  api.get(`/fueling-operations/${id}`).then((r) => r.data);

export const createOperation = (data) =>
  api.post('/fueling-operations', data).then((r) => r.data);

export const deleteOperation = (id) =>
  api.delete(`/fueling-operations/${id}`).then((r) => r.data);

export const getOperationsStats = () =>
  api.get('/fueling-operations/stats').then((r) => r.data);

export const getDashboardCharts = () =>
  api.get('/dashboard/charts').then((r) => r.data);

export const uploadOperationAttachments = (id, formData) =>
  api.post(`/fueling-operations/${id}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
