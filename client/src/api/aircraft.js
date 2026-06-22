import api from './index.js';

export const getAircraft = () => api.get('/aircraft').then((r) => r.data);

export const getAircraftById = (id) => api.get(`/aircraft/${id}`).then((r) => r.data);

export const createAircraft = (data) => api.post('/aircraft', data).then((r) => r.data);

export const updateAircraft = (id, data) => api.put(`/aircraft/${id}`, data).then((r) => r.data);

export const deleteAircraft = (id) => api.delete(`/aircraft/${id}`).then((r) => r.data);
