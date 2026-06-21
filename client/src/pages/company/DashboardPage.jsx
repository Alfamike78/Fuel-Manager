import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Fuel, Gauge, Plane, Truck, BarChart3, Plus,
  AlertTriangle, Clock, CheckCircle, Activity, Droplets
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getOperationsStats } from '../../api/fuelingOperations.js';
import { getTanks } from '../../api/tanks.js';
import NewOperationModal from './operations/NewOperationModal.jsx';

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <Card>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-sm font-medium text-gray-700">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </Card>
);

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState(null);
  const [lowTanks, setLowTanks] = useState([]);
  const [newModal, setNewModal] = useState(false);

  useEffect(() => {
    getOperationsStats()
      .then(setStats)
      .catch(() => {});

    getTanks()
      .then((tanks) =>
        setLowTanks(
          tanks.filter(
            (t) =>
              t.min_threshold_liters &&
              parseFloat(t.current_liters) <= parseFloat(t.min_threshold_liters)
          )
        )
      )
      .catch(() => {});
  }, []);

  const statCards = [
    {
      icon: Gauge,
      label: t('dashboard.tanks'),
      value: stats?.tanks_count ?? '—',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Plane,
      label: t('dashboard.aircraft'),
      value: stats?.aircraft_count ?? '—',
      color: 'bg-sky-100 text-sky-600',
    },
    {
      icon: Truck,
      label: t('dashboard.vehicles'),
      value: stats?.vehicles_count ?? '—',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: Fuel,
      label: t('operations.today'),
      value: stats?.operations_today ?? '—',
      sub: stats ? `${parseFloat(stats.liters_today).toFixed(0)} L ${t('operations.dispensed_today')}` : '',
      color: 'bg-violet-100 text-violet-600',
    },
  ];

  const quickActions = [
    {
      icon: Fuel,
      label: t('dashboard.new_operation'),
      desc: t('operations.new_desc'),
      color: 'bg-blue-100 text-blue-600',
      action: () => setNewModal(true),
    },
    {
      icon: Gauge,
      label: t('dashboard.manage_tanks'),
      desc: t('operations.manage_tanks_desc'),
      color: 'bg-sky-100 text-sky-600',
      action: () => navigate('/dashboard/tanks'),
    },
    {
      icon: Plane,
      label: t('dashboard.manage_aircraft'),
      desc: t('operations.manage_aircraft_desc'),
      color: 'bg-indigo-100 text-indigo-600',
      action: () => navigate('/dashboard/aircraft'),
    },
    {
      icon: BarChart3,
      label: t('dashboard.view_reports'),
      desc: t('operations.view_reports_desc'),
      color: 'bg-violet-100 text-violet-600',
      action: () => navigate('/dashboard/reports'),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Welcome header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t('dashboard.welcome')}, {user?.first_name}! 👋
            </h1>
            <p className="text-gray-500 text-sm mt-1">
              {user?.company_name} &mdash;{' '}
              {new Date().toLocaleDateString('it-IT', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={() => setNewModal(true)}
            className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
          >
            <Plus size={16} />
            {t('dashboard.new_operation')}
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {statCards.map((s) => (
            <StatCard key={s.label} {...s} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Low tanks alert */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>{t('dashboard.recent_operations')}</Card.Title>
                  <button
                    onClick={() => navigate('/dashboard/operations')}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                  >
                    {t('operations.view_all')}
                  </button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Activity size={40} className="mb-3 opacity-30" />
                  <p className="font-medium text-gray-500">{t('operations.empty')}</p>
                  <p className="text-sm mt-1">{t('operations.empty_desc')}</p>
                  <button
                    onClick={() => setNewModal(true)}
                    className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
                  >
                    <Plus size={14} />
                    {t('dashboard.new_operation')}
                  </button>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Status panel */}
          <div className="space-y-5">
            <Card>
              <Card.Header>
                <Card.Title>{t('dashboard.system_status')}</Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {lowTanks.length > 0 ? (
                      <AlertTriangle size={16} className="text-red-500" />
                    ) : (
                      <CheckCircle size={16} className="text-green-500" />
                    )}
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{t('dashboard.tank_levels')}</p>
                      <p className="text-xs text-gray-400">
                        {lowTanks.length > 0
                          ? `${lowTanks.length} ${t('dashboard.below_threshold')}`
                          : t('dashboard.all_ok')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Droplets size={16} className="text-blue-500" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{t('operations.today')}</p>
                      <p className="text-xs text-gray-400">
                        {stats
                          ? `${stats.operations_today} ${t('operations.total_ops')} — ${parseFloat(stats.liters_today).toFixed(0)} L`
                          : '—'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock size={16} className="text-gray-400" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{t('dashboard.last_updated')}</p>
                      <p className="text-xs text-gray-400">
                        {new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>

            {user?.company_status === 'trial' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800 text-sm">{t('dashboard.trial_active')}</p>
                    <p className="text-yellow-700 text-xs mt-1">{t('dashboard.trial_desc')}</p>
                    <button className="mt-3 text-xs font-semibold text-yellow-800 underline underline-offset-2">
                      {t('dashboard.upgrade')} →
                    </button>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('dashboard.quick_actions')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.label}
                onClick={action.action}
                className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all text-left group"
              >
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${action.color}`}>
                  <action.icon size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{action.label}</p>
                  <p className="text-xs text-gray-400 truncate">{action.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <NewOperationModal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        onSaved={() => {
          getOperationsStats().then(setStats).catch(() => {});
          setNewModal(false);
        }}
      />
    </AdminLayout>
  );
};

export default DashboardPage;
