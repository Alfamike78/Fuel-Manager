import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Plane, Pencil, Trash2, Search, Clock } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import FuelTypeBadge from '../../../components/tanks/FuelTypeBadge.jsx';
import AircraftFormModal from './AircraftFormModal.jsx';
import { getAircraft, deleteAircraft } from '../../../api/aircraft.js';
import { useAuth } from '../../../hooks/useAuth.js';

const FUEL_COLORS = {
  jet_a1: '#1a1a1a',
  avgas: '#dc2626',
};

const AircraftCard = ({ aircraft, isAdmin, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const borderColor = FUEL_COLORS[aircraft.fuel_type] || '#6b7280';

  return (
    <div
      className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden"
      style={{ borderLeftWidth: '4px', borderLeftColor: borderColor }}
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Plane size={16} className="text-blue-600 flex-shrink-0" />
              <h3 className="text-base font-bold text-gray-900 font-mono">{aircraft.registration}</h3>
            </div>
            <p className="text-sm text-gray-600 mt-0.5 truncate">{aircraft.model}</p>
          </div>
        </div>

        {/* Fuel type */}
        <div className="mb-3">
          <FuelTypeBadge fuelType={aircraft.fuel_type} size="sm" />
        </div>

        {/* Flight hours */}
        <div className="flex items-center gap-1.5 text-sm text-gray-600 mb-4">
          <Clock size={14} className="text-gray-400" />
          <span className="font-medium">{parseFloat(aircraft.total_flight_hours).toFixed(1)}</span>
          <span className="text-gray-400">{t('aircraft.hours_label')}</span>
        </div>

        {/* Notes */}
        {aircraft.notes && (
          <p className="text-xs text-gray-500 mb-3 italic line-clamp-2">{aircraft.notes}</p>
        )}

        {/* Actions */}
        {isAdmin && (
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => onEdit(aircraft)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors"
            >
              <Pencil size={13} />
              {t('common.edit')}
            </button>
            <button
              onClick={() => onDelete(aircraft)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
            >
              <Trash2 size={13} />
              {t('common.delete')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const AircraftPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [aircraft, setAircraft] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');
  const [fuelFilter, setFuelFilter] = useState('all');
  const [formModal, setFormModal] = useState({ open: false, aircraft: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getAircraft();
      setAircraft(data);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleDelete = async (ac) => {
    try {
      await deleteAircraft(ac.id);
      setConfirmDelete(null);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    }
  };

  const filtered = aircraft.filter((ac) => {
    if (fuelFilter !== 'all' && ac.fuel_type !== fuelFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!ac.registration.toLowerCase().includes(q) && !ac.model.toLowerCase().includes(q)) return false;
    }
    return true;
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('aircraft.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {filtered.length} {filtered.length === 1 ? t('aircraft.singular') : t('aircraft.title').toLowerCase()}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setFormModal({ open: true, aircraft: null })}>
              <Plus size={16} />
              {t('aircraft.add')}
            </Button>
          )}
        </div>

        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Filters */}
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`${t('common.search')}...`}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={fuelFilter}
            onChange={(e) => setFuelFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">{t('aircraft.filter_all')}</option>
            <option value="jet_a1">{t('fuel.jet_a1')}</option>
            <option value="avgas">{t('fuel.avgas')}</option>
          </select>
        </div>

        {/* Grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <Plane size={48} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">{t('aircraft.empty')}</p>
            <p className="text-sm mt-1">
              {search || fuelFilter !== 'all'
                ? t('aircraft.empty_filter')
                : isAdmin
                ? t('aircraft.empty_admin')
                : t('aircraft.empty_operator')}
            </p>
            {isAdmin && !search && fuelFilter === 'all' && (
              <Button className="mt-4" onClick={() => setFormModal({ open: true, aircraft: null })}>
                <Plus size={15} />
                {t('aircraft.add')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
            {filtered.map((ac) => (
              <AircraftCard
                key={ac.id}
                aircraft={ac}
                isAdmin={isAdmin}
                onEdit={(a) => setFormModal({ open: true, aircraft: a })}
                onDelete={(a) => setConfirmDelete(a)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">{t('aircraft.delete')}</h3>
            <p className="text-sm text-gray-500 mb-6">
              {t('aircraft.delete_confirm', { reg: confirmDelete.registration })}
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

      <AircraftFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, aircraft: null })}
        aircraft={formModal.aircraft}
        onSaved={fetchData}
      />
    </AdminLayout>
  );
};

export default AircraftPage;
