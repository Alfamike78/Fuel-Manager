import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Bell, AlertTriangle, Info, CheckCircle, CheckCheck,
  Trash2, Filter, Gauge, ArrowLeft
} from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Card from '../../../components/ui/Card.jsx';
import { useNotifications } from '../../../contexts/NotificationsContext.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import clsx from 'clsx';

const SEVERITY_STYLES = {
  critical: {
    icon: AlertTriangle,
    iconClass: 'text-red-500',
    rowBg: 'bg-red-50 border-l-4 border-red-400',
    badge: 'bg-red-100 text-red-700',
    label: 'Critico',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    rowBg: 'bg-amber-50 border-l-4 border-amber-400',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Avviso',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    rowBg: 'bg-blue-50 border-l-4 border-blue-400',
    badge: 'bg-blue-100 text-blue-700',
    label: 'Info',
  },
};

const NotificationsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin' || user?.role === 'superadmin';
  const {
    notifications, unreadCount, loading,
    fetchNotifications, markAsRead, markAllAsRead,
    deleteNotification, deleteReadNotifications,
  } = useNotifications();

  const [filter, setFilter] = useState('all'); // all | unread | warning | critical

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const filtered = notifications.filter((n) => {
    if (filter === 'unread') return !n.is_read;
    if (filter === 'warning') return n.severity === 'warning';
    if (filter === 'critical') return n.severity === 'critical';
    return true;
  });

  const formatDate = (d) =>
    new Date(d).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/dashboard')}
              className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Bell size={22} />
                {t('notifications.title')}
                {unreadCount > 0 && (
                  <span className="bg-red-500 text-white text-sm font-bold px-2 py-0.5 rounded-full">
                    {unreadCount}
                  </span>
                )}
              </h1>
              <p className="text-gray-500 text-sm mt-0.5">{t('notifications.subtitle')}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-xl transition-colors"
              >
                <CheckCheck size={16} />
                {t('notifications.mark_all_read')}
              </button>
            )}
            {isAdmin && notifications.some((n) => n.is_read) && (
              <button
                onClick={deleteReadNotifications}
                className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-500 hover:bg-red-50 hover:text-red-600 rounded-xl transition-colors"
              >
                <Trash2 size={16} />
                {t('notifications.clear_read')}
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 flex-wrap">
          {[
            { key: 'all', label: t('common.all') },
            { key: 'unread', label: t('notifications.unread') },
            { key: 'critical', label: t('notifications.severity_critical') },
            { key: 'warning', label: t('notifications.severity_warning') },
          ].map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={clsx(
                'px-3 py-1.5 text-sm font-medium rounded-lg transition-colors',
                filter === key
                  ? 'bg-blue-600 text-white'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Notification list */}
        <Card>
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <CheckCircle size={48} className="mb-3 opacity-30" />
              <p className="font-medium text-gray-500 text-lg">{t('notifications.all_clear')}</p>
              <p className="text-sm mt-1">{t('notifications.all_clear_desc')}</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map((n) => {
                const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.warning;
                const Icon = style.icon;
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      'flex items-start gap-4 px-6 py-4 transition-colors group',
                      !n.is_read ? style.rowBg : 'hover:bg-gray-50'
                    )}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon size={20} className={style.iconClass} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={clsx('text-sm font-semibold text-gray-900', !n.is_read && 'font-bold')}>
                              {n.title}
                            </span>
                            <span className={clsx('text-xs font-medium px-2 py-0.5 rounded-full', style.badge)}>
                              {style.label}
                            </span>
                            {!n.is_read && (
                              <span className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">{n.message}</p>
                          <p className="text-xs text-gray-400 mt-1.5">{formatDate(n.created_at)}</p>
                        </div>

                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!n.is_read && (
                            <button
                              onClick={() => markAsRead(n.id)}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('notifications.mark_read')}
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                          {n.reference_type === 'tank' && (
                            <button
                              onClick={() => navigate('/dashboard/tanks')}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                              title={t('notifications.go_to_tank')}
                            >
                              <Gauge size={15} />
                            </button>
                          )}
                          {isAdmin && (
                            <button
                              onClick={() => deleteNotification(n.id)}
                              className="opacity-0 group-hover:opacity-100 p-1.5 text-gray-300 hover:text-red-400 hover:bg-red-50 rounded-lg transition-all"
                              title={t('common.delete')}
                            >
                              <Trash2 size={15} />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Tank alert tip */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl">
          <Info size={16} className="text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-sm text-blue-700">
            {t('notifications.tip_threshold')}
          </p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default NotificationsPage;
