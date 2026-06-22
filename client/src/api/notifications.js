import api from './index.js';

export const getNotifications = (params = {}) =>
  api.get('/notifications', { params }).then((r) => r.data);

export const getUnreadCount = () =>
  api.get('/notifications/unread-count').then((r) => r.data.count);

export const markAsRead = (id) =>
  api.put(`/notifications/${id}/read`).then((r) => r.data);

export const markAllAsRead = () =>
  api.put('/notifications/read-all').then((r) => r.data);

export const deleteNotification = (id) =>
  api.delete(`/notifications/${id}`).then((r) => r.data);

export const deleteReadNotifications = () =>
  api.delete('/notifications').then((r) => r.data);
