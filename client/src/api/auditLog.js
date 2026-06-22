import api from './index.js';

export const getAuditLog = (params = {}) =>
  api.get('/audit-log', { params }).then((r) => r.data);

export const getAuditEntityTypes = () =>
  api.get('/audit-log/entity-types').then((r) => r.data);
