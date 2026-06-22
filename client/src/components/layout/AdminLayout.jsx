import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Fuel, Gauge, MapPin, BarChart3, Users, Settings,
  Menu, X, LogOut, ChevronDown, Plane, Truck,
  ClipboardList, ChevronRight
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import LanguageSwitcher from '../LanguageSwitcher.jsx';
import clsx from 'clsx';

const navItems = [
  {
    label: 'dashboard.operations',
    icon: Fuel,
    path: '/dashboard',
    end: true,
  },
  {
    label: 'dashboard.tanks',
    icon: Gauge,
    path: '/dashboard/tanks',
  },
  {
    label: 'dashboard.aircraft',
    icon: Plane,
    path: '/dashboard/aircraft',
  },
  {
    label: 'dashboard.vehicles',
    icon: Truck,
    path: '/dashboard/vehicles',
  },
  {
    label: 'nav.features',
    icon: MapPin,
    path: '/dashboard/bases',
  },
  {
    label: 'dashboard.reports',
    icon: BarChart3,
    path: '/dashboard/reports',
  },
  {
    label: 'roles.admin',
    icon: Users,
    path: '/dashboard/users',
  },
];

const AdminLayout = ({ children }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-blue-800">
        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
          <Fuel size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Fuel Manager</p>
          <p className="text-blue-300 text-xs leading-tight">PilotCraft Solutions</p>
        </div>
      </div>

      {/* Company name */}
      <div className="px-6 py-3 bg-blue-800/50">
        <p className="text-blue-300 text-xs font-medium uppercase tracking-wider">Azienda</p>
        <p className="text-white text-sm font-semibold truncate mt-0.5">
          {user?.company_name || 'N/A'}
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            onClick={() => setSidebarOpen(false)}
            className={({ isActive }) =>
              clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            {t(item.label)}
          </NavLink>
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-3 py-4 border-t border-blue-800 space-y-1">
        <NavLink
          to="/dashboard/settings"
          className={({ isActive }) =>
            clsx(
              'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
              isActive
                ? 'bg-blue-600 text-white'
                : 'text-blue-200 hover:bg-blue-800 hover:text-white'
            )
          }
        >
          <Settings size={18} />
          Impostazioni
        </NavLink>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-blue-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-blue-900 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-blue-200 hover:text-white"
            >
              <X size={20} />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-gray-200 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <Menu size={20} />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-3">
            <LanguageSwitcher />

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.first_name?.[0]?.toUpperCase() || 'U'}
                </div>
                <span className="hidden sm:block text-sm font-medium text-gray-700">
                  {user?.first_name} {user?.last_name}
                </span>
                <ChevronDown size={14} className="text-gray-400" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 top-full mt-1 w-48 bg-white rounded-xl border border-gray-200 shadow-lg z-50">
                  <div className="px-4 py-3 border-b border-gray-100">
                    <p className="text-sm font-semibold text-gray-900">
                      {user?.first_name} {user?.last_name}
                    </p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    <LogOut size={15} />
                    {t('auth.logout')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
