import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import {
  Fuel, Gauge, Plane, Truck, BarChart3, Plus,
  AlertTriangle, Clock, CheckCircle, Activity, Droplets,
} from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getOperationsStats, getDashboardCharts } from '../../api/fuelingOperations.js';
import { getTanks } from '../../api/tanks.js';
import NewOperationModal from './operations/NewOperationModal.jsx';

// ─── colori per tipo carburante ───────────────────────────────────────────────
const FUEL_COLORS = {
  avgas_100ll: '#1d4ed8',
  jet_a1:      '#7c3aed',
  mogas:       '#059669',
  diesel:      '#d97706',
  other:       '#6b7280',
};

const fuelLabel = (type) =>
  ({ avgas_100ll: 'AVGAS 100LL', jet_a1: 'Jet-A1', mogas: 'Mogas', diesel: 'Diesel' }[type] || type);

// ─── tooltip personalizzato per AreaChart ─────────────────────────────────────
const DailyTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700 mb-1">{label}</p>
      <p className="text-blue-600">{payload[0].value} L</p>
    </div>
  );
};

// ─── tooltip per PieChart ─────────────────────────────────────────────────────
const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm">
      <p className="font-semibold text-gray-700">{fuelLabel(payload[0].name)}</p>
      <p style={{ color: payload[0].payload.fill }}>{payload[0].value} L</p>
    </div>
  );
};

// ─── StatCard ─────────────────────────────────────────────────────────────────
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

// ─── DashboardPage ────────────────────────────────────────────────────────────
const DashboardPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats]     = useState(null);
  const [charts, setCharts]   = useState(null);
  const [lowTanks, setLowTanks] = useState([]);
  const [newModal, setNewModal] = useState(false);

  const loadData = () => {
    getOperationsStats().then(setStats).catch(() => {});
    getDashboardCharts().then(setCharts).catch(() => {});
    getTanks()
      .then((tanks) =>
        setLowTanks(
          tanks.filter(
            (t) => t.min_threshold_liters && parseFloat(t.current_liters) <= parseFloat(t.min_threshold_liters)
          )
        )
      )
      .catch(() => {});
  };

  useEffect(() => { loadData(); }, []);

  const statCards = [
    { icon: Gauge,  label: t('dashboard.tanks'),    value: stats?.tanks_count    ?? '—', color: 'bg-blue-100 text-blue-600' },
    { icon: Plane,  label: t('dashboard.aircraft'),  value: stats?.aircraft_count ?? '—', color: 'bg-sky-100 text-sky-600' },
    { icon: Truck,  label: t('dashboard.vehicles'),  value: stats?.vehicles_count ?? '—', color: 'bg-indigo-100 text-indigo-600' },
    {
      icon: Fuel,
      label: t('operations.today'),
      value: stats?.operations_today ?? '—',
      sub: stats ? `${parseFloat(stats.liters_today).toFixed(0)} L ${t('operations.dispensed_today')}` : '',
      color: 'bg-violet-100 text-violet-600',
    },
  ];

  const quickActions = [
    { icon: Fuel,    label: t('dashboard.new_operation'),   desc: t('operations.new_desc'),           color: 'bg-blue-100 text-blue-600',    action: () => setNewModal(true) },
    { icon: Gauge,   label: t('dashboard.manage_tanks'),    desc: t('operations.manage_tanks_desc'),   color: 'bg-sky-100 text-sky-600',      action: () => navigate('/dashboard/tanks') },
    { icon: Plane,   label: t('dashboard.manage_aircraft'), desc: t('operations.manage_aircraft_desc'),color: 'bg-indigo-100 text-indigo-600',action: () => navigate('/dashboard/aircraft') },
    { icon: BarChart3,label: t('dashboard.view_reports'),   desc: t('operations.view_reports_desc'),   color: 'bg-violet-100 text-violet-600',action: () => navigate('/dashboard/reports') },
  ];

  const hasDaily      = charts?.daily?.length > 0;
  const hasFuelType   = charts?.byFuelType?.length > 0;
  const hasAircraft   = charts?.topAircraft?.length > 0;
  const hasRecentOps  = charts?.recentOps?.length > 0;

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
              {new Date().toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
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
          {statCards.map((s) => <StatCard key={s.label} {...s} />)}
        </div>

        {/* ── Grafico consumi giornalieri ──────────────────────────────────── */}
        <Card>
          <Card.Header>
            <Card.Title>Consumi giornalieri — ultimi 30 giorni (L)</Card.Title>
          </Card.Header>
          <Card.Body>
            {hasDaily ? (
              <ResponsiveContainer width="100%" height={220}>
                <AreaChart data={charts.daily} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradBlue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#1d4ed8" stopOpacity={0.18} />
                      <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} width={48} />
                  <Tooltip content={<DailyTooltip />} />
                  <Area
                    type="monotone" dataKey="liters" name="Litri"
                    stroke="#1d4ed8" strokeWidth={2}
                    fill="url(#gradBlue)" dot={false} activeDot={{ r: 4 }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                <Activity size={36} className="mb-2 opacity-30" />
                <p className="text-sm">Nessun dato disponibile</p>
              </div>
            )}
          </Card.Body>
        </Card>

        {/* ── Riga: Pie + Bar ──────────────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Distribuzione per tipo carburante */}
          <Card>
            <Card.Header>
              <Card.Title>Distribuzione per tipo carburante</Card.Title>
            </Card.Header>
            <Card.Body>
              {hasFuelType ? (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={charts.byFuelType}
                        dataKey="liters"
                        nameKey="fuel_type"
                        cx="50%" cy="50%"
                        innerRadius={55} outerRadius={85}
                        paddingAngle={3}
                      >
                        {charts.byFuelType.map((entry) => (
                          <Cell
                            key={entry.fuel_type}
                            fill={FUEL_COLORS[entry.fuel_type] || FUEL_COLORS.other}
                          />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mt-2">
                    {charts.byFuelType.map((entry) => (
                      <div key={entry.fuel_type} className="flex items-center gap-1.5 text-xs text-gray-600">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ background: FUEL_COLORS[entry.fuel_type] || FUEL_COLORS.other }}
                        />
                        {fuelLabel(entry.fuel_type)} — {entry.liters} L
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Droplets size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">Nessun dato disponibile</p>
                </div>
              )}
            </Card.Body>
          </Card>

          {/* Top 5 aeromobili */}
          <Card>
            <Card.Header>
              <Card.Title>Top 5 aeromobili — consumo litri</Card.Title>
            </Card.Header>
            <Card.Body>
              {hasAircraft ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart
                    data={charts.topAircraft}
                    layout="vertical"
                    margin={{ top: 0, right: 24, left: 0, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 11, fill: '#9ca3af' }} tickLine={false} axisLine={false} />
                    <YAxis dataKey="registration" type="category" tick={{ fontSize: 11, fill: '#374151' }} tickLine={false} axisLine={false} width={72} />
                    <Tooltip
                      formatter={(val) => [`${val} L`, 'Litri']}
                      contentStyle={{ fontSize: 12, borderRadius: 8 }}
                    />
                    <Bar dataKey="liters" fill="#1d4ed8" radius={[0, 4, 4, 0]} barSize={18} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex flex-col items-center justify-center py-12 text-gray-400">
                  <Plane size={36} className="mb-2 opacity-30" />
                  <p className="text-sm">Nessun dato disponibile</p>
                </div>
              )}
            </Card.Body>
          </Card>
        </div>

        {/* ── Riga: Ultime operazioni + stato sistema ──────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* Ultime operazioni */}
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
                {hasRecentOps ? (
                  <div className="divide-y divide-gray-50">
                    {charts.recentOps.map((op) => {
                      const dest =
                        op.dest_type === 'aircraft'       ? op.dest_aircraft_reg :
                        op.dest_type === 'ground_vehicle' ? `${op.dest_vehicle_plate || ''} ${op.dest_vehicle_name || ''}`.trim() :
                        op.dest_tank_name || '—';
                      const opDate = new Date(op.operation_date);
                      return (
                        <div key={op.id} className="flex items-center gap-3 py-3">
                          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center flex-shrink-0">
                            <Fuel size={14} className="text-blue-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{dest}</p>
                            <p className="text-xs text-gray-400">
                              {fuelLabel(op.fuel_type)} · {op.operator_first_name} {op.operator_last_name}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-semibold text-blue-700">{parseFloat(op.liters).toFixed(0)} L</p>
                            <p className="text-xs text-gray-400">
                              {opDate.toLocaleDateString('it-IT', { day: '2-digit', month: '2-digit' })}{' '}
                              {opDate.toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
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
                )}
              </Card.Body>
            </Card>
          </div>

          {/* Stato sistema */}
          <div className="space-y-5">
            <Card>
              <Card.Header>
                <Card.Title>{t('dashboard.system_status')}</Card.Title>
              </Card.Header>
              <Card.Body>
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {lowTanks.length > 0
                      ? <AlertTriangle size={16} className="text-red-500" />
                      : <CheckCircle   size={16} className="text-green-500" />
                    }
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
        onSaved={() => { loadData(); setNewModal(false); }}
      />
    </AdminLayout>
  );
};

export default DashboardPage;
