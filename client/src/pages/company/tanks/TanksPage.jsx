import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, AlertTriangle, History, Droplets, ClipboardCheck, Pencil, Trash2, Search } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Badge from '../../../components/ui/Badge.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import FuelTypeBadge from '../../../components/tanks/FuelTypeBadge.jsx';
import TankLevelBar from '../../../components/tanks/TankLevelBar.jsx';
import TankFormModal from './TankFormModal.jsx';
import AddLoadModal from './AddLoadModal.jsx';
import QCModal from './QCModal.jsx';
import TankHistoryModal from './TankHistoryModal.jsx';
import { getTanks, deleteTank } from '../../../api/tanks.js';
import { getBases } from '../../../api/bases.js';
import { useAuth } from '../../../hooks/useAuth.js';

const FUEL_COLORS = {
  jet_a1: '#1a1a1a',
  avgas: '#dc2626',
  diesel: '#16a34a',
  gasoline: '#ca8a04',
};

const TankCard = ({ tank, isAdmin, onEdit, onDelete, onAddLoad, onQC, onHistory }) => {
  const { t } = useTranslation();
  const isLow =
    tank.min_threshold_liters &&
    parseFloat(tank.current_liters) <= parseFloat(tank.min_threshold_liters);
  const borderColor = FUEL_COLORS[tank.fuel_type] || '#6b7280';

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-gray-900 truncate">{tank.name}</h3>
              {isLow && (
                <AlertTriangle
                  size={15}
                  className="text-red-500 flex-shrink-0"
                  title={t('tanks.below_threshold')}
                />
              )}
            </div>
            <span className="inline-block mt-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
              {tank.code}
            </span>
          </div>
          <span
            className={`ml-2 flex-shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full ${
              tank.tank_type === 'fixed'
                ? 'bg-slate-100 text-slate-700'
                : 'bg-purple-100 text-purple-700'
            }`}
          >
            {tank.tank_type === 'fixed' ? t('tanks.fixed') : t('tanks.mobile')}
          </span>
        </div>

        {/* Fuel type */}
        <div className="mb-3">
          <FuelTypeBadge fuelType={tank.fuel_type} size="sm" />
        </div>

        {/* Base */}
        <p className="text-xs text-gray-500 mb-3">
          {tank.base_name ? (
            <>
              <span className="font-medium text-gray-700">{tank.base_name}</span>
            </>
          ) : (
            <span className="italic text-gray-400">{t('tanks.no_base')}</span>
          )}
        </p>

        {/* Level bar */}
        <div className="mb-4">
          <TankLevelBar
            current={tank.current_liters}
            capacity={tank.capacity_liters}
            threshold={tank.min_threshold_liters}
          />
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => onHistory(tank)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <History size={13} />
            {t('tanks.history')}
          </button>
          <button
            onClick={() => onAddLoad(tank)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Droplets size={13} />
            {t('tanks.add_load')}
          </button>
          <button
            onClick={() => onQC(tank)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <ClipboardCheck size={13} />
            {t('tanks.qc_check')}
          </button>
          {isAdmin && (
            <>
              <button
                onClick={() => onEdit(tank)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
              >
                <Pencil size={13} />
                {t('common.edit')}
              </button>
              <button
                onClick={() => onDelete(tank)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
              >
                <Trash2 size={13} />
                {t('common.delete')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const TanksPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [tanks, setTanks] = useState([]);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [fuelFilter, setFuelFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Modals
  const [formModal, setFormModal] = useState({ open: false, tank: null });
  const [loadModal, setLoadModal] = useState({ open: false, tank: null });
  const [qcModal, setQcModal] = useState({ open: false, tank: null });
  const [historyModal, setHistoryModal] = useState({ open: false, tank: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [tanksData, basesData] = await Promise.all([getTanks(), getBases()]);
      setTanks(tanksData);
      setBases(basesData);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (tank) => {
    try {
      await deleteTank(tank.id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    }
  };

  const filteredTanks = tanks.filter((tank) => {
    if (fuelFilter !== 'all' && tank.fuel_type !== fuelFilter) return false;
    if (typeFilter !== 'all' && tank.tank_type !== typeFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!tank.name.toLowerCase().includes(q) && !tank.code.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('tanks.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filteredTanks.length} {filteredTanks.length === 1 ? 'tank' : 'tanks'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setFormModal({ open: true, tank: null })}>
              <Plus size={16} />
              {t('tanks.add')}
            </Button>
          )}
        </div>

        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          {/* Search */}
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('common.search')} by name or code...`}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Fuel type filter */}
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('tanks.filter_all')}</option>
            <option value="jet_a1">{t('fuel.jet_a1')}</option>
            <option value="avgas">{t('fuel.avgas')}</option>
            <option value="diesel">{t('fuel.diesel')}</option>
            <option value="gasoline">{t('fuel.gasoline')}</option>
          </select>

          {/* Tank type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Types</option>
            <option value="fixed">{t('tanks.filter_fixed')}</option>
            <option value="mobile">{t('tanks.filter_mobile')}</option>
          </select>
        </div>

        {/* Tank grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredTanks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Droplets size={48} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No tanks found</p>
            <p className="text-sm mt-1">
              {search || fuelFilter !== 'all' || typeFilter !== 'all'
                ? 'Try adjusting your filters'
                : isAdmin
                ? 'Add your first tank to get started'
                : 'No tanks have been configured yet'}
            </p>
            {isAdmin && !search && fuelFilter === 'all' && typeFilter === 'all' && (
              <Button
                className="mt-4"
                onClick={() => setFormModal({ open: true, tank: null })}
              >
                <Plus size={15} />
                {t('tanks.add')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filteredTanks.map((tank) => (
              <TankCard
                key={tank.id}
                tank={tank}
                isAdmin={isAdmin}
                onEdit={(t) => setFormModal({ open: true, tank: t })}
                onDelete={(t) => setConfirmDelete(t)}
                onAddLoad={(t) => setLoadModal({ open: true, tank: t })}
                onQC={(t) => setQcModal({ open: true, tank: t })}
                onHistory={(t) => setHistoryModal({ open: true, tank: t })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setConfirmDelete(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('tanks.delete')}</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>? This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>
                {t('common.cancel')}
              </Button>
              <Button variant="danger" onClick={() => handleDelete(confirmDelete)}>
                {t('common.delete')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <TankFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, tank: null })}
        tank={formModal.tank}
        bases={bases}
        onSaved={fetchData}
      />
      <AddLoadModal
        isOpen={loadModal.open}
        onClose={() => setLoadModal({ open: false, tank: null })}
        tank={loadModal.tank}
        onSaved={fetchData}
      />
      <QCModal
        isOpen={qcModal.open}
        onClose={() => setQcModal({ open: false, tank: null })}
        tank={qcModal.tank}
        onSaved={fetchData}
      />
      <TankHistoryModal
        isOpen={historyModal.open}
        onClose={() => setHistoryModal({ open: false, tank: null })}
        tank={historyModal.tank}
      />
    </AdminLayout>
  );
};

export default TanksPage;
