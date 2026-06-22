import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Fuel, Plane, Truck, Gauge, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import FuelTypeBadge from '../../../components/tanks/FuelTypeBadge.jsx';
import NewOperationModal from './NewOperationModal.jsx';
import { getOperations, deleteOperation } from '../../../api/fuelingOperations.js';
import { useAuth } from '../../../hooks/useAuth.js';

const PAGE_SIZE = 50;

const DestIcon = ({ type }) => {
  if (type === 'aircraft') return <Plane size={14} className="text-sky-500" />;
  if (type === 'ground_vehicle') return <Truck size={14} className="text-green-500" />;
  return <Gauge size={14} className="text-blue-500" />;
};

const destLabel = (op) => {
  if (op.dest_type === 'aircraft') return op.dest_aircraft_reg || '—';
  if (op.dest_type === 'ground_vehicle') return `${op.dest_vehicle_plate || '—'} ${op.dest_vehicle_name ? `(${op.dest_vehicle_name})` : ''}`.trim();
  if (op.dest_type === 'tank') return op.dest_tank_name || '—';
  return '—';
};

const sourceLabel = (op) => {
  if (op.source_type === 'tank') return op.source_tank_name || '—';
  return op.external_source_name || '—';
};

const OperationsPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [ops, setOps] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [destTypeFilter, setDestTypeFilter] = useState('');

  const [newModal, setNewModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { limit: PAGE_SIZE, offset: page * PAGE_SIZE };
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (destTypeFilter) params.dest_type = destTypeFilter;
      const { data, total: t } = await getOperations(params);
      setOps(data);
      setTotal(t);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [page, dateFrom, dateTo, destTypeFilter, t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (op) => {
    try {
      await deleteOperation(op.id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  const formatDate = (d) =>
    new Date(d).toLocaleString('it-IT', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <AdminLayout>
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('operations.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">{total} {t('operations.total')}</p>
          </div>
          <Button onClick={() => setNewModal(true)}>
            <Plus size={16} />
            {t('operations.new')}
          </Button>
        </div>

        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center bg-white p-3 rounded-xl border border-gray-200">
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">{t('operations.filter_from')}</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => { setDateFrom(e.target.value); setPage(0); }}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-gray-600">{t('operations.filter_to')}</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => { setDateTo(e.target.value); setPage(0); }}
              className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={destTypeFilter}
            onChange={(e) => { setDestTypeFilter(e.target.value); setPage(0); }}
            className="px-2 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('operations.all_dest')}</option>
            <option value="aircraft">{t('dashboard.aircraft')}</option>
            <option value="ground_vehicle">{t('dashboard.vehicles')}</option>
            <option value="tank">{t('dashboard.tanks')}</option>
          </select>
          {(dateFrom || dateTo || destTypeFilter) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); setDestTypeFilter(''); setPage(0); }}
              className="text-xs text-gray-500 hover:text-gray-700 underline underline-offset-2"
            >
              {t('common.filter')} ✕
            </button>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : ops.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 bg-white rounded-xl border border-gray-200">
            <Fuel size={48} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">{t('operations.empty')}</p>
            <p className="text-sm mt-1">{t('operations.empty_desc')}</p>
            <Button className="mt-4" onClick={() => setNewModal(true)}>
              <Plus size={15} />
              {t('operations.new')}
            </Button>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.date')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.source')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.destination')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.fuel')}</th>
                    <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.liters')}</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.operator')}</th>
                    {isAdmin && <th className="px-4 py-3" />}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {ops.map((op) => (
                    <tr key={op.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-gray-700 whitespace-nowrap">{formatDate(op.operation_date)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {op.source_type === 'tank'
                            ? <Gauge size={14} className="text-blue-400 flex-shrink-0" />
                            : <Fuel size={14} className="text-gray-400 flex-shrink-0" />}
                          <span className="text-gray-700">{sourceLabel(op)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <DestIcon type={op.dest_type} />
                          <span className="text-gray-700">{destLabel(op)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <FuelTypeBadge fuelType={op.fuel_type} size="xs" />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                        {parseFloat(op.liters).toFixed(1)} L
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                        {op.operator_first_name} {op.operator_last_name}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setConfirmDelete(op)}
                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                            title={t('common.delete')}
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-xs text-gray-500">
                  {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, total)} {t('operations.of')} {total}
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(0, p - 1))}
                    disabled={page === 0}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs text-gray-600 px-2">
                    {page + 1} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
                    disabled={page >= totalPages - 1}
                    className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-200 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('operations.delete')}</h3>
            <p className="text-sm text-gray-500 mb-6">{t('operations.delete_confirm')}</p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>{t('common.delete')}</Button>
            </div>
          </div>
        </div>
      )}

      <NewOperationModal
        isOpen={newModal}
        onClose={() => setNewModal(false)}
        onSaved={fetchData}
      />
    </AdminLayout>
  );
};

export default OperationsPage;
