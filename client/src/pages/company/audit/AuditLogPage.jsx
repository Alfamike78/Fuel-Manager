import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Shield, Search, Filter, ChevronLeft, ChevronRight,
  Fuel, Gauge, Users, Package, ArrowLeft, RefreshCw
} from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Card from '../../../components/ui/Card.jsx';
import { getAuditLog, getAuditEntityTypes } from '../../../api/auditLog.js';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

const ACTION_COLORS = {
  'fueling_operation.create': 'bg-blue-100 text-blue-700',
  'fueling_operation.delete': 'bg-red-100 text-red-700',
  'tank.create':              'bg-green-100 text-green-700',
  'tank.update':              'bg-yellow-100 text-yellow-700',
  'tank.delete':              'bg-red-100 text-red-700',
  'user.invite':              'bg-violet-100 text-violet-700',
  'user.role_change':         'bg-indigo-100 text-indigo-700',
};

const ENTITY_ICONS = {
  fueling_operation: Fuel,
  tank: Gauge,
  user: Users,
};

const PAGE_SIZE = 25;

const AuditLogPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [entries, setEntries] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [entityTypes, setEntityTypes] = useState([]);

  const [filters, setFilters] = useState({
    entity_type: '',
    action: '',
    date_from: '',
    date_to: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE };
      if (filters.entity_type) params.entity_type = filters.entity_type;
      if (filters.action) params.action = filters.action;
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;

      const result = await getAuditLog(params);
      setEntries(result.data);
      setTotal(result.total);
    } catch (_) {} finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    getAuditEntityTypes().then(setEntityTypes).catch(() => {});
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { setPage(1); }, [filters]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (d) =>
    new Date(d).toLocaleString('it-IT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });

  const setFilter = (key) => (e) =>
    setFilters((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Shield size={22} />
              {t('audit.title')}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{t('audit.subtitle')}</p>
          </div>
          <button
            onClick={fetchData}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title={t('common.refresh')}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={filters.action}
                onChange={setFilter('action')}
                placeholder={t('audit.filter_action')}
                className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <select
              value={filters.entity_type}
              onChange={setFilter('entity_type')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">{t('audit.all_entities')}</option>
              {entityTypes.map((et) => (
                <option key={et} value={et}>{et}</option>
              ))}
            </select>

            <input
              type="date"
              value={filters.date_from}
              onChange={setFilter('date_from')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="date"
              value={filters.date_to}
              onChange={setFilter('date_to')}
              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </Card>

        {/* Log table */}
        <Card padding={false}>
          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Shield size={48} className="mb-3 opacity-20" />
              <p className="text-gray-500 font-medium">{t('audit.empty')}</p>
              <p className="text-sm mt-1">{t('audit.empty_desc')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50">
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{t('audit.col_when')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{t('audit.col_user')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{t('audit.col_action')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{t('audit.col_entity')}</th>
                    <th className="text-left text-xs font-semibold text-gray-500 uppercase tracking-wider px-5 py-3">{t('audit.col_details')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {entries.map((entry) => {
                    const EntityIcon = ENTITY_ICONS[entry.entity_type] || Package;
                    return (
                      <tr key={entry.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap">
                          <span className="text-xs text-gray-500 font-mono">{formatDate(entry.created_at)}</span>
                        </td>
                        <td className="px-5 py-3">
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {entry.user_first_name} {entry.user_last_name}
                            </p>
                            <p className="text-xs text-gray-400">{entry.user_email}</p>
                          </div>
                        </td>
                        <td className="px-5 py-3">
                          <span className={clsx('px-2 py-0.5 rounded-full text-xs font-semibold font-mono', ACTION_COLORS[entry.action] || 'bg-gray-100 text-gray-700')}>
                            {entry.action}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          {entry.entity_type && (
                            <div className="flex items-center gap-1.5">
                              <EntityIcon size={13} className="text-gray-400" />
                              <span className="text-sm text-gray-600">{entry.entity_type}</span>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 max-w-xs">
                          {entry.metadata && (
                            <p className="text-xs text-gray-500 font-mono truncate">
                              {Object.entries(entry.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')}
                            </p>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, total)} {t('audit.of')} {total}
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

        {/* Privacy note */}
        <div className="flex items-start gap-3 p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <Shield size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-gray-500">{t('audit.privacy_note')}</p>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AuditLogPage;
