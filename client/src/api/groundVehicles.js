import api from './index.js';

export const getGroundVehicles = () => api.get('/ground-vehicles').then((r) => r.data);

export const getGroundVehicleById = (id) => api.get(`/ground-vehicles/${id}`).then((r) => r.data);

export const createGroundVehicle = (data) => api.post('/ground-vehicles', data).then((r) => r.data);

export const updateGroundVehicle = (id, data) => api.put(`/ground-vehicles/${id}`, data).then((r) => r.data);

export const deleteGroundVehicle = (id) => api.delete(`/ground-vehicles/${id}`).then((r) => r.data);
