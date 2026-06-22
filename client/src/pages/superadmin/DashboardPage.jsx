import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Building2, Users, TrendingUp, Clock, CheckCircle,
  AlertCircle, MoreVertical, ArrowUpRight, Search, Filter
} from 'lucide-react';
import axios from 'axios';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';

const STATUS_COLORS = {
  active: 'success',
  trial: 'warning',
  suspended: 'danger',
  cancelled: 'default',
};

const StatCard = ({ icon: Icon, label, value, sub, color }) => (
  <Card>
    <div className="flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{label}</p>
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        {sub && <p className="text-sm text-gray-400 mt-1">{sub}</p>}
      </div>
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon size={22} />
      </div>
    </div>
  </Card>
);

const DashboardPage = () => {
  const { t } = useTranslation();
  const [companies, setCompanies] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    trial: 0,
    suspended: 0,
    revenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await axios.get('/companies?limit=10');
        const data = res.data;

        setCompanies(data.companies || []);

        const allCompanies = data.companies || [];
        setStats({
          total: data.total || 0,
          active: allCompanies.filter((c) => c.status === 'active').length,
          trial: allCompanies.filter((c) => c.status === 'trial').length,
          suspended: allCompanies.filter((c) => c.status === 'suspended').length,
          revenue: 0,
        });
      } catch {
        // Use stub data when API unavailable
        setCompanies([]);
        setStats({ total: 0, active: 0, trial: 0, suspended: 0, revenue: 0 });
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const filteredCompanies = companies.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SuperAdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard SuperAdmin</h1>
            <p className="text-gray-500 text-sm mt-0.5">Panoramica di tutte le aziende</p>
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
            label={t('dashboard.total_companies')}
            value={loading ? '—' : stats.total}
            sub="Aziende registrate"
            color="bg-blue-100 text-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            label={t('dashboard.active_companies')}
            value={loading ? '—' : stats.active}
            sub="Con piano attivo"
            color="bg-green-100 text-green-600"
          />
          <StatCard
            icon={Clock}
            label={t('dashboard.trial_companies')}
            value={loading ? '—' : stats.trial}
            sub="In periodo di prova"
            color="bg-yellow-100 text-yellow-600"
          />
          <StatCard
            icon={TrendingUp}
            label={t('dashboard.monthly_revenue')}
            value={loading ? '—' : `€${stats.revenue.toLocaleString()}`}
            sub="Questo mese"
            color="bg-violet-100 text-violet-600"
          />
        </div>

        {/* Companies table */}
        <Card padding={false}>
          <div className="p-6 border-b border-gray-100 flex items-center gap-4">
            <div className="flex-1 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca aziende..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50">
              <Filter size={14} />
              Filtra
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : filteredCompanies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="font-medium">Nessuna azienda trovata</p>
              <p className="text-sm mt-1">Le aziende appariranno qui dopo la registrazione</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Azienda</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Piano</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Stato</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Utenti</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-6 py-3">Registrata</th>
                    <th className="px-6 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filteredCompanies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ backgroundColor: company.primary_color || '#1e40af' }}
                          >
                            {company.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-semibold text-gray-900 text-sm">{company.name}</p>
                            <p className="text-gray-400 text-xs">{company.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{company.plan_name || '—'}</span>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={STATUS_COLORS[company.status] || 'default'}>
                          {company.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-700">{company.user_count || 0}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <button className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                          <MoreVertical size={15} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Aggiungi piano', icon: ArrowUpRight, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100' },
            { label: 'Esporta report', icon: TrendingUp, color: 'text-green-600 bg-green-50 hover:bg-green-100' },
            { label: 'Segnalazioni', icon: AlertCircle, color: 'text-yellow-600 bg-yellow-50 hover:bg-yellow-100' },
          ].map((action) => (
            <button
              key={action.label}
              className={`flex items-center gap-3 p-4 rounded-xl font-medium text-sm transition-colors ${action.color}`}
            >
              <action.icon size={18} />
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </SuperAdminLayout>
  );
};

export default DashboardPage;
