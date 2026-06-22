import api from './index.js';

export const getFuelingReport = (params = {}) =>
  api.get('/reports/fueling', { params }).then((r) => r.data);

export const getTanksReport = () =>
  api.get('/reports/tanks').then((r) => r.data);

export const getQCReport = (params = {}) =>
  api.get('/reports/quality-checks', { params }).then((r) => r.data);

export const getOperatorsList = () =>
  api.get('/reports/operators').then((r) => r.data);

export const buildExcelUrl = (params) => {
  const token = localStorage.getItem('token');
  const base = api.defaults.baseURL;
  const qs = new URLSearchParams({ ...params, token }).toString();
  return `${base}/reports/export/excel?${qs}`;
};

export const buildPdfUrl = (params) => {
  const token = localStorage.getItem('token');
  const base = api.defaults.baseURL;
  const qs = new URLSearchParams({ ...params, token }).toString();
  return `${base}/reports/export/pdf?${qs}`;
};
