import api from './index.js';

export const getCompanySettings = () =>
  api.get('/company-settings').then((r) => r.data);

export const updateCompanySettings = (data) =>
  api.put('/company-settings', data).then((r) => r.data);

export const uploadCompanyLogo = (file) => {
  const formData = new FormData();
  formData.append('logo', file);
  return api
    .post('/company-settings/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteCompanyLogo = () =>
  api.delete('/company-settings/logo').then((r) => r.data);
