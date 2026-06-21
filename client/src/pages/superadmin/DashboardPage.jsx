import React, { useState, useEffect } from 'react';
import {
  Building2, Users, TrendingUp, Clock, CheckCircle, AlertCircle,
  Fuel, Gauge, Activity, EuroIcon
} from 'lucide-react';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import { getSuperAdminStats } from '../../api/superadmin.js';
import clsx from 'clsx';

const StatCard = ({ icon: Icon, label, value, sub, color, trend }) => (
  <Card>
    <div className="flex items-start justify-between mb-3">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={20} />
      </div>
      {trend != null && (
        <span className={clsx('text-xs font-semibold px-2 py-1 rounded-full', trend >= 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700')}>
          {trend >= 0 ? '+' : ''}{trend}%
        </span>
      )}
    </div>
    <p className="text-3xl font-bold text-gray-900 mb-1">{value}</p>
    <p className="text-sm font-medium text-gray-700">{label}</p>
    {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
  </Card>
);

const PlanBar = ({ name, count, total, color }) => {
  const pct = total > 0 ? (count / total) * 100 : 0;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-medium text-gray-700">{name}</span>
        <span className="text-sm text-gray-500">{count} aziende</span>
      </div>
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
};

const PLAN_COLORS = ['bg-yellow-400', 'bg-blue-400', 'bg-violet-500', 'bg-emerald-500'];

const DashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSuperAdminStats()
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const c = stats?.companies;

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard SuperAdmin</h1>
            <p className="text-gray-500 text-sm mt-0.5">Metriche globali della piattaforma</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Sistema operativo
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatCard
            icon={Building2}
            label="Aziende totali"
            value={loading ? '—' : c?.total ?? 0}
            sub={`${c?.active ?? 0} attive · ${c?.trial ?? 0} trial`}
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={Users}
            label="Utenti totali"
            value={loading ? '—' : stats?.users_total ?? 0}
            sub="Tutti i ruoli"
            color="bg-indigo-100 text-indigo-600"
          />
          <StatCard
            icon={Fuel}
            label="Operazioni totali"
            value={loading ? '—' : (stats?.operations_total ?? 0).toLocaleString()}
            sub={`${loading ? '—' : Math.round((stats?.liters_total ?? 0) / 1000).toLocaleString()} kL erogati`}
            color="bg-violet-100 text-violet-600"
          />
          <StatCard
            icon={TrendingUp}
            label="MRR stimato"
            value={loading ? '—' : `€${(stats?.mrr ?? 0).toLocaleString()}`}
            sub="Ricavi mensili ricorrenti"
            color="bg-emerald-100 text-emerald-600"
          />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Company status breakdown */}
          <Card>
            <Card.Header><Card.Title>Stato aziende</Card.Title></Card.Header>
            <Card.Body>
              <div className="space-y-4">
                {[
                  { key: 'active', label: 'Attive', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-100' },
                  { key: 'trial', label: 'Trial', color: 'bg-yellow-400', text: 'text-yellow-700', bg: 'bg-yellow-100' },
                  { key: 'suspended', label: 'Sospese', color: 'bg-red-400', text: 'text-red-700', bg: 'bg-red-100' },
                  { key: 'cancelled', label: 'Cancellate', color: 'bg-gray-300', text: 'text-gray-600', bg: 'bg-gray-100' },
                ].map(({ key, label, color, text, bg }) => {
                  const count = c?.[key] ?? 0;
                  const total = c?.total ?? 1;
                  return (
                    <div key={key} className="flex items-center gap-4">
                      <span className={clsx('px-2.5 py-0.5 rounded-full text-xs font-semibold w-24 text-center', bg, text)}>{label}</span>
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${color}`} style={{ width: `${(count / total) * 100}%` }} />
                      </div>
                      <span className="text-sm font-bold text-gray-900 w-8 text-right">{count}</span>
                    </div>
                  );
                })}
              </div>
            </Card.Body>
          </Card>

          {/* Plan distribution */}
          <Card>
            <Card.Header><Card.Title>Distribuzione piani</Card.Title></Card.Header>
            <Card.Body>
              <div className="space-y-4">
                {(stats?.plans ?? []).map((plan, i) => (
                  <PlanBar
                    key={plan.id}
                    name={`${plan.name}${plan.price_monthly > 0 ? ` (€${plan.price_monthly}/mo)` : ' (gratuito)'}`}
                    count={plan.company_count}
                    total={c?.total ?? 1}
                    color={PLAN_COLORS[i % PLAN_COLORS.length]}
                  />
                ))}
                {!loading && !stats?.plans?.length && (
                  <p className="text-sm text-gray-400 text-center py-4">Nessun piano configurato</p>
                )}
              </div>
            </Card.Body>
          </Card>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Gestisci aziende', icon: Building2, href: '/superadmin/companies', color: 'text-blue-600 bg-blue-50 hover:bg-blue-100 border-blue-100' },
            { label: 'Gestisci piani', icon: TrendingUp, href: '/superadmin/plans', color: 'text-violet-600 bg-violet-50 hover:bg-violet-100 border-violet-100' },
            { label: 'Alert sospese', icon: AlertCircle, badge: c?.suspended, color: 'text-red-600 bg-red-50 hover:bg-red-100 border-red-100' },
          ].map((a) => (
            <a
              key={a.label}
              href={a.href}
              onClick={a.href ? undefined : (e) => e.preventDefault()}
              className={clsx('flex items-center gap-3 p-4 rounded-xl border font-medium text-sm transition-colors', a.color)}
            >
              <a.icon size={18} />
              {a.label}
              {a.badge > 0 && (
                <span className="ml-auto bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">{a.badge}</span>
              )}
            </a>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default DashboardPage;
