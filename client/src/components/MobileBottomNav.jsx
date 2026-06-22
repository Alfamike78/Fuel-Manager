import React from 'react';
import { NavLink } from 'react-router-dom';
import { Fuel, Gauge, Plane, BarChart3, MoreHorizontal } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useNotifications } from '../contexts/NotificationsContext.jsx';
import clsx from 'clsx';

const PRIMARY_NAV = [
  { path: '/dashboard/operations', icon: Fuel, labelKey: 'dashboard.operations' },
  { path: '/dashboard/tanks',      icon: Gauge, labelKey: 'dashboard.tanks' },
  { path: '/dashboard/aircraft',   icon: Plane, labelKey: 'dashboard.aircraft' },
  { path: '/dashboard/reports',    icon: BarChart3, labelKey: 'dashboard.reports' },
];

const MobileBottomNav = ({ onMoreClick }) => {
  const { t } = useTranslation();
  const { unreadCount } = useNotifications();

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 safe-area-inset-bottom">
      <div className="flex items-stretch h-16">
        {PRIMARY_NAV.map(({ path, icon: Icon, labelKey }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) =>
              clsx(
                'flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium transition-colors',
                isActive ? 'text-blue-600' : 'text-gray-400'
              )
            }
          >
            {({ isActive }) => (
              <>
                <Icon size={20} strokeWidth={isActive ? 2.5 : 1.8} />
                <span>{t(labelKey)}</span>
              </>
            )}
          </NavLink>
        ))}

        {/* More button */}
        <button
          onClick={onMoreClick}
          className="flex-1 flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium text-gray-400 relative"
        >
          <div className="relative">
            <MoreHorizontal size={20} strokeWidth={1.8} />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-red-500 text-white text-[8px] font-bold rounded-full flex items-center justify-center">
                {unreadCount > 9 ? '9+' : unreadCount}
              </span>
            )}
          </div>
          <span>Altro</span>
        </button>
      </div>
    </nav>
  );
};

export default MobileBottomNav;
