import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Building2, Search, MoreVertical, CheckCircle, Clock,
  AlertCircle, XCircle, ChevronLeft, ChevronRight,
  Users, Gauge, Fuel, LogIn
} from 'lucide-react';
import SuperAdminLayout from '../../components/layout/SuperAdminLayout.jsx';
import Card from '../../components/ui/Card.jsx';
import Badge from '../../components/ui/Badge.jsx';
import Modal from '../../components/ui/Modal.jsx';
import Alert from '../../components/ui/Alert.jsx';
import {
  getCompanies, getCompany, getCompanyStats,
  changeCompanyPlan, changeCompanyStatus,
} from '../../api/superadmin.js';
import { useAuth } from '../../hooks/useAuth.js';
import axios from 'axios';
import clsx from 'clsx';

const STATUS_BADGE = {
  active: 'success',
  trial: 'warning',
  suspended: 'danger',
  cancelled: 'default',
};

const STATUS_ICONS = {
  active: CheckCircle,
  trial: Clock,
  suspended: AlertCircle,
  cancelled: XCircle,
};

const STATUSES = ['active', 'trial', 'suspended', 'cancelled'];

// ─── Company Detail Modal ─────────────────────────────────────────────────────
const CompanyDetailModal = ({ company, onClose, onUpdated }) => {
  const [detail, setDetail] = useState(null);
  const [stats, setStats] = useState(null);
  const [plans, setPlans] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    if (!company) return;
    Promise.all([
      getCompany(company.id),
      getCompanyStats(company.id),
      axios.get('/companies/stats').then((r) => r.data.plans).catch(() => []),
    ]).then(([d, s, p]) => {
      setDetail(d);
      setStats(s);
      setPlans(p);
    }).catch(() => {});
  }, [company]);

  const handlePlanChange = async (plan_id) => {
    setSaving(true);
    setError(null);
    try {
      await changeCompanyPlan(company.id, plan_id);
      setSuccess('Piano aggiornato.');
      onUpdated();
      const d = await getCompany(company.id);
      setDetail(d);
    } catch (e) {
      setError(e.response?.data?.error || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (status) => {
    setSaving(true);
    setError(null);
    try {
      await changeCompanyStatus(company.id, status);
      setSuccess('Stato aggiornato.');
      onUpdated();
      const d = await getCompany(company.id);
      setDetail(d);
    } catch (e) {
      setError(e.response?.data?.error || 'Errore');
    } finally {
      setSaving(false);
    }
  };

  if (!company) return null;

  return (
    <Modal isOpen={!!company} onClose={onClose} title={company.name} size="lg">
      <div className="space-y-5">
        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}
        {success && <Alert variant="success" onClose={() => setSuccess(null)}>{success}</Alert>}

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Fuel, label: 'Operazioni', value: stats?.operations_total ?? '—' },
            { icon: Gauge, label: 'Cisterne', value: stats?.tanks_count ?? '—' },
            { icon: Users, label: 'Utenti', value: stats?.users_count ?? '—' },
            { icon: Fuel, label: 'Litri totali', value: stats ? `${Math.round(stats.liters_total).toLocaleString()} L` : '—' },
          ].map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-gray-900">{value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {/* Change plan */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Piano abbonamento</p>
            <div className="space-y-2">
              {plans.map((plan) => (
                <button
                  key={plan.id}
                  onClick={() => handlePlanChange(plan.id)}
                  disabled={saving || detail?.plan_id === plan.id}
                  className={clsx(
                    'w-full flex items-center justify-between px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors',
                    detail?.plan_id === plan.id
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                  )}
                >
                  <span>{plan.name}</span>
                  <span className="text-gray-400 text-xs">
                    {plan.price_monthly > 0 ? `€${plan.price_monthly}/mo` : 'Gratuito'}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Change status */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Stato azienda</p>
            <div className="space-y-2">
              {STATUSES.map((s) => {
                const Icon = STATUS_ICONS[s];
                return (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    disabled={saving || detail?.status === s}
                    className={clsx(
                      'w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-colors capitalize',
                      detail?.status === s
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-blue-300 text-gray-700 hover:bg-gray-50'
                    )}
                  >
                    <Icon size={14} />
                    {s}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Meta info */}
        <div className="pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs text-gray-500">
          <span>Slug: <code className="text-gray-700">{detail?.slug}</code></span>
          <span>Registrata: {detail ? new Date(detail.created_at).toLocaleDateString('it-IT') : '—'}</span>
          {stats?.last_operation_at && (
            <span>Ultima operazione: {new Date(stats.last_operation_at).toLocaleString('it-IT')}</span>
          )}
        </div>
      </div>
    </Modal>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const PAGE_SIZE = 15;

const CompaniesPage = () => {
  const { impersonate } = useAuth();
  const navigate = useNavigate();
  const [companies, setCompanies] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [actionMenuId, setActionMenuId] = useState(null);
  const [impersonating, setImpersonating] = useState(null);

  const handleImpersonate = async (company) => {
    setImpersonating(company.id);
    try {
      await impersonate(company.id, company.name);
      navigate('/dashboard');
    } catch {
      setImpersonating(null);
    }
  };

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: PAGE_SIZE };
      if (search) params.search = search;
      if (statusFilter) params.status = statusFilter;
      const data = await getCompanies(params);
      setCompanies(data.companies || []);
      setTotal(data.total || 0);
    } catch (_) {} finally {
      setLoading(false);
    }
  }, [page, search, statusFilter]);

  useEffect(() => { fetchCompanies(); }, [fetchCompanies]);

  // Reset to page 1 on filter change
  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <SuperAdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestione Aziende</h1>
          <p className="text-gray-500 text-sm mt-0.5">{total} aziende registrate</p>
        </div>

        {/* Filters */}
        <Card padding={false}>
          <div className="p-4 flex flex-wrap gap-3 border-b border-gray-100">
            <div className="flex-1 min-w-48 relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Cerca per nome o slug..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {['', ...STATUSES].map((s) => (
                <button
                  key={s || 'all'}
                  onClick={() => setStatusFilter(s)}
                  className={clsx(
                    'px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors capitalize',
                    statusFilter === s
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'border-gray-200 text-gray-600 hover:border-gray-400'
                  )}
                >
                  {s || 'Tutti'}
                </button>
              ))}
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : companies.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-48 text-gray-400">
              <Building2 size={40} className="mb-3 opacity-30" />
              <p className="font-medium text-gray-500">Nessuna azienda trovata</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Azienda</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Piano</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Stato</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Utenti</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">Registrata</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {companies.map((company) => (
                    <tr key={company.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3.5">
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
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-700">{company.plan_name || '—'}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge variant={STATUS_BADGE[company.status] || 'default'}>
                          {company.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-700">{company.user_count || 0}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="text-sm text-gray-500">
                          {new Date(company.created_at).toLocaleDateString('it-IT')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleImpersonate(company)}
                            disabled={impersonating === company.id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-semibold rounded-lg transition-colors disabled:opacity-60"
                          >
                            <LogIn size={13} />
                            {impersonating === company.id ? '...' : 'Entra'}
                          </button>
                          <div className="relative">
                            <button
                              onClick={() => setActionMenuId(actionMenuId === company.id ? null : company.id)}
                              className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                              <MoreVertical size={15} />
                            </button>
                            {actionMenuId === company.id && (
                              <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl border border-gray-200 shadow-lg z-20 py-1">
                                <button
                                  onClick={() => { setSelectedCompany(company); setActionMenuId(null); }}
                                  className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                >
                                  Gestisci azienda
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} di {total}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="text-sm text-gray-700 px-2 py-1.5">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="p-1.5 text-gray-400 hover:text-gray-700 disabled:opacity-30 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </Card>
      </div>

      {/* Company detail modal */}
      <CompanyDetailModal
        company={selectedCompany}
        onClose={() => setSelectedCompany(null)}
        onUpdated={fetchCompanies}
      />

      {/* Close action menus on outside click */}
      {actionMenuId && (
        <div className="fixed inset-0 z-10" onClick={() => setActionMenuId(null)} />
      )}
    </SuperAdminLayout>
  );
};

export default CompaniesPage;
