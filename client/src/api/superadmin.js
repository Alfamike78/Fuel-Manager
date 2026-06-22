import api from './index.js';

export const getSuperAdminStats = () =>
  api.get('/companies/stats').then((r) => r.data);

export const getCompanies = (params = {}) =>
  api.get('/companies', { params }).then((r) => r.data);

export const getCompany = (id) =>
  api.get(`/companies/${id}`).then((r) => r.data);

export const getCompanyStats = (id) =>
  api.get(`/companies/${id}/stats`).then((r) => r.data);

export const changeCompanyPlan = (id, plan_id) =>
  api.patch(`/companies/${id}/plan`, { plan_id }).then((r) => r.data);

export const changeCompanyStatus = (id, status) =>
  api.patch(`/companies/${id}/status`, { status }).then((r) => r.data);
