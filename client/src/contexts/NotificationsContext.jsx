import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../hooks/useAuth.js';
import { getNotifications, getUnreadCount, markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications } from '../api/notifications.js';

const NotificationsContext = createContext(null);

const POLL_INTERVAL_MS = 30_000; // 30 seconds

export const NotificationsProvider = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const intervalRef = useRef(null);

  const isSuperAdmin = user?.role === 'superadmin';

  const fetchUnreadCount = useCallback(async () => {
    if (!isAuthenticated || isSuperAdmin) return;
    try {
      const count = await getUnreadCount();
      setUnreadCount(count);
    } catch (_) {}
  }, [isAuthenticated, isSuperAdmin]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated || isSuperAdmin) return;
    setLoading(true);
    try {
      const result = await getNotifications({ limit: 50 });
      setNotifications(result.data);
      setUnreadCount(result.unread_count);
    } catch (_) {} finally {
      setLoading(false);
    }
  }, [isAuthenticated, isSuperAdmin]);

  // Initial load + polling for badge count
  useEffect(() => {
    if (!isAuthenticated || isSuperAdmin) {
      setUnreadCount(0);
      setNotifications([]);
      return;
    }

    fetchUnreadCount();
    intervalRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
    return () => clearInterval(intervalRef.current);
  }, [isAuthenticated, isSuperAdmin, fetchUnreadCount]);

  const handleMarkAsRead = useCallback(async (id) => {
    try {
      await markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  }, []);

  const handleMarkAllAsRead = useCallback(async () => {
    try {
      await markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (_) {}
  }, []);

  const handleDelete = useCallback(async (id) => {
    try {
      await deleteNotification(id);
      setNotifications((prev) => {
        const removed = prev.find((n) => n.id === id);
        if (removed && !removed.is_read) setUnreadCount((c) => Math.max(0, c - 1));
        return prev.filter((n) => n.id !== id);
      });
    } catch (_) {}
  }, []);

  const handleDeleteRead = useCallback(async () => {
    try {
      await deleteReadNotifications();
      setNotifications((prev) => prev.filter((n) => !n.is_read));
    } catch (_) {}
  }, []);

  return (
    <NotificationsContext.Provider
      value={{
        notifications,
        unreadCount,
        loading,
        fetchNotifications,
        markAsRead: handleMarkAsRead,
        markAllAsRead: handleMarkAllAsRead,
        deleteNotification: handleDelete,
        deleteReadNotifications: handleDeleteRead,
      }}
    >
      {children}
    </NotificationsContext.Provider>
  );
};

export const useNotifications = () => {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error('useNotifications must be used inside NotificationsProvider');
  return ctx;
};
