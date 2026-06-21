import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Fuel, Gauge, Plane, Truck, BarChart3, Plus,
  TrendingUp, AlertTriangle, Clock, CheckCircle,
  ChevronRight, Activity
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import { useAuth } from '../../hooks/useAuth.js';

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <Card>
    <div className="flex items-start justify-between mb-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      {trend !== undefined && (
        <span className={`text-xs font-semibold px-2 py-1 rounded-full ${trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-sm font-medium text-gray-700">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </Card>
);

const QuickActionCard = ({ icon: Icon, label, desc, color, onClick }) => (
  <button
    onClick={onClick}
    className="flex items-center gap-4 p-4 rounded-xl border border-gray-200 hover:border-blue-200 hover:shadow-md hover:shadow-blue-50 transition-all text-left group"
  >
    <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${color}`}>
      <Icon size={18} />
    </div>
    <div className="flex-1 min-w-0">
      <p className="font-semibold text-gray-900 text-sm">{label}</p>
      <p className="text-xs text-gray-400 truncate">{desc}</p>
    </div>
    <ChevronRight size={15} className="text-gray-300 group-hover:text-blue-500 transition-colors" />
  </button>
);

const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const stats = [
    {
      icon: Gauge,
      label: t('dashboard.tanks'),
      value: '0',
      sub: 'Nessuna cisterna configurata',
      color: 'bg-blue-100 text-blue-600',
      trend: null,
    },
    {
      icon: Plane,
      label: t('dashboard.aircraft'),
      value: '0',
      sub: 'Nessun aeromobile registrato',
      color: 'bg-sky-100 text-sky-600',
      trend: null,
    },
    {
      icon: Truck,
      label: t('dashboard.vehicles'),
      value: '0',
      sub: 'Nessun veicolo configurato',
      color: 'bg-indigo-100 text-indigo-600',
      trend: null,
    },
    {
      icon: Fuel,
      label: t('dashboard.operations'),
      value: '0',
      sub: 'Nessuna operazione oggi',
      color: 'bg-violet-100 text-violet-600',
      trend: null,
    },
  ];

  const quickActions = [
    {
      icon: Fuel,
      label: t('dashboard.new_operation'),
      desc: 'Registra un nuovo rifornimento',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Gauge,
      label: t('dashboard.manage_tanks'),
      desc: 'Aggiungi o modifica cisterne',
      color: 'bg-sky-100 text-sky-600',
    },
    {
      icon: Plane,
      label: t('dashboard.manage_aircraft'),
      desc: 'Gestisci la flotta aeromobili',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: BarChart3,
      label: t('dashboard.view_reports'),
      desc: 'Genera ed esporta report',
      color: 'bg-violet-100 text-violet-600',
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
              {user?.company_name} &mdash; {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>

          <button className="hidden sm:flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
            <Plus size={16} />
            {t('dashboard.new_operation')}
          </button>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {stats.map((stat) => (
            <StatCard key={stat.label} {...stat} />
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent operations (stub) */}
          <div className="lg:col-span-2">
            <Card>
              <Card.Header>
                <div className="flex items-center justify-between">
                  <Card.Title>{t('dashboard.recent_operations')}</Card.Title>
                  <button className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                    Vedi tutto
                  </button>
                </div>
              </Card.Header>
              <Card.Body>
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Activity size={40} className="mb-3 opacity-30" />
                  <p className="font-medium text-gray-500">Nessuna operazione recente</p>
                  <p className="text-sm mt-1">Le operazioni appariranno qui dopo il primo rifornimento</p>
                  <button className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors">
                    <Plus size={14} />
                    Registra il primo rifornimento
                  </button>
                </div>
              </Card.Body>
            </Card>
          </div>

          {/* Status and quick actions */}
          <div className="space-y-5">
            {/* System status */}
            <Card>
              <Card.Header>
                <Card.Title>Stato sistema</Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  {[
                    { label: 'Cisterne OK', icon: CheckCircle, color: 'text-green-500', status: 'Tutte operative' },
                    { label: 'Soglie carburante', icon: AlertTriangle, color: 'text-yellow-500', status: 'Nessun avviso' },
                    { label: 'QC programmati', icon: Clock, color: 'text-blue-500', status: 'Nessuno oggi' },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-3">
                      <item.icon size={16} className={item.color} />
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">{item.label}</p>
                        <p className="text-xs text-gray-400">{item.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card.Body>
            </Card>

            {/* Trial info */}
            {user?.company_status === 'trial' && (
              <Card className="border-yellow-200 bg-yellow-50">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={18} className="text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-yellow-800 text-sm">Piano Trial attivo</p>
                    <p className="text-yellow-700 text-xs mt-1">
                      Stai usando il piano di prova gratuito. Aggiorna il piano per sbloccare tutte le funzionalità.
                    </p>
                    <button className="mt-3 text-xs font-semibold text-yellow-800 underline underline-offset-2">
                      Aggiorna piano →
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
              <QuickActionCard key={action.label} {...action} />
            ))}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DashboardPage;
