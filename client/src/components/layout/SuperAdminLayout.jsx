import React, { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, CreditCard, Settings, Menu, X,
  LogOut, ChevronDown, Shield, BarChart3, Fuel
} from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import LanguageSwitcher from '../LanguageSwitcher.jsx';
import clsx from 'clsx';

const navItems = [
  {
    label: 'Dashboard',
    icon: BarChart3,
    path: '/superadmin',
    end: true,
  },
  {
    label: 'Aziende',
    icon: Building2,
    path: '/superadmin/companies',
  },
  {
    label: 'Utenti',
    icon: Users,
    path: '/superadmin/users',
  },
  {
    label: 'Piani',
    icon: CreditCard,
    path: '/superadmin/plans',
  },
  {
    label: 'Impostazioni',
    icon: Settings,
    path: '/superadmin/settings',
  },
];

const SuperAdminLayout = ({ children }) => {
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
      <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
        <div className="w-9 h-9 bg-blue-500 rounded-lg flex items-center justify-center">
          <Fuel size={20} className="text-white" />
        </div>
        <div>
          <p className="text-white font-bold text-sm leading-tight">Fuel Manager</p>
          <p className="text-gray-400 text-xs leading-tight">SuperAdmin</p>
        </div>
      </div>

      {/* Role badge */}
      <div className="px-6 py-3 bg-gray-800/50">
        <div className="flex items-center gap-2">
          <Shield size={13} className="text-yellow-400" />
          <span className="text-yellow-400 text-xs font-semibold uppercase tracking-wider">
            {t('roles.superadmin')}
          </span>
        </div>
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
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              )
            }
          >
            <item.icon size={18} />
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar - Desktop */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Sidebar - Mobile overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="relative w-64 bg-gray-900 flex flex-col">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-white"
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
                <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center text-white text-sm font-semibold">
                  {user?.first_name?.[0]?.toUpperCase() || 'S'}
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
                    <p className="text-xs text-yellow-600 font-medium mt-0.5">{t('roles.superadmin')}</p>
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

export default SuperAdminLayout;
