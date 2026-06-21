import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { Bell, AlertTriangle, Info, CheckCircle, X, CheckCheck, Trash2 } from 'lucide-react';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import clsx from 'clsx';

const SEVERITY_STYLES = {
  critical: {
    icon: AlertTriangle,
    iconClass: 'text-red-500',
    bg: 'bg-red-50',
    dot: 'bg-red-500',
    badge: 'bg-red-100 text-red-700',
  },
  warning: {
    icon: AlertTriangle,
    iconClass: 'text-amber-500',
    bg: 'bg-amber-50',
    dot: 'bg-amber-500',
    badge: 'bg-amber-100 text-amber-700',
  },
  info: {
    icon: Info,
    iconClass: 'text-blue-500',
    bg: 'bg-blue-50',
    dot: 'bg-blue-500',
    badge: 'bg-blue-100 text-blue-700',
  },
};

const TimeAgo = ({ dateString }) => {
  const { t } = useTranslation();
  const date = new Date(dateString);
  const diff = (Date.now() - date.getTime()) / 1000;
  if (diff < 60) return <span>{t('notifications.just_now')}</span>;
  if (diff < 3600) return <span>{Math.floor(diff / 60)} {t('notifications.minutes_ago')}</span>;
  if (diff < 86400) return <span>{Math.floor(diff / 3600)} {t('notifications.hours_ago')}</span>;
  return <span>{Math.floor(diff / 86400)} {t('notifications.days_ago')}</span>;
};

const NotificationsDropdown = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { notifications, unreadCount, fetchNotifications, markAsRead, markAllAsRead, deleteNotification, deleteReadNotifications } = useNotifications();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Load full list when dropdown opens
  useEffect(() => {
    if (open) fetchNotifications();
  }, [open, fetchNotifications]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const preview = notifications.slice(0, 5);

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        aria-label={t('notifications.title')}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center bg-red-500 text-white text-[10px] font-bold rounded-full px-1 leading-none">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-96 bg-white rounded-2xl border border-gray-200 shadow-xl z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Bell size={16} className="text-gray-700" />
              <span className="font-semibold text-gray-900 text-sm">{t('notifications.title')}</span>
              {unreadCount > 0 && (
                <span className="bg-red-100 text-red-700 text-xs font-bold px-2 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  title={t('notifications.mark_all_read')}
                >
                  <CheckCheck size={15} />
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
            {preview.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                <CheckCircle size={32} className="mb-2 opacity-40" />
                <p className="text-sm font-medium text-gray-500">{t('notifications.all_clear')}</p>
                <p className="text-xs mt-0.5">{t('notifications.all_clear_desc')}</p>
              </div>
            ) : (
              preview.map((n) => {
                const style = SEVERITY_STYLES[n.severity] || SEVERITY_STYLES.warning;
                const Icon = style.icon;
                return (
                  <div
                    key={n.id}
                    className={clsx(
                      'flex gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors group',
                      !n.is_read && style.bg
                    )}
                    onClick={() => {
                      if (!n.is_read) markAsRead(n.id);
                      if (n.reference_type === 'tank') {
                        navigate('/dashboard/tanks');
                        setOpen(false);
                      }
                    }}
                  >
                    <div className="flex-shrink-0 mt-0.5">
                      <Icon size={16} className={style.iconClass} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <p className={clsx('text-sm font-medium text-gray-900 leading-tight', !n.is_read && 'font-semibold')}>
                          {n.title}
                        </p>
                        {!n.is_read && (
                          <span className={clsx('flex-shrink-0 w-2 h-2 rounded-full mt-1', style.dot)} />
                        )}
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                      <p className="text-[10px] text-gray-400 mt-1">
                        <TimeAgo dateString={n.created_at} />
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteNotification(n.id);
                      }}
                      className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-400 rounded transition-all"
                    >
                      <X size={12} />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
            <button
              onClick={() => {
                navigate('/dashboard/notifications');
                setOpen(false);
              }}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              {t('notifications.view_all')}
            </button>
            {notifications.some((n) => n.is_read) && (
              <button
                onClick={deleteReadNotifications}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors"
              >
                <Trash2 size={11} />
                {t('notifications.clear_read')}
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationsDropdown;
