import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Fuel, Plane, Truck, Gauge } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { getTanks } from '../../../api/tanks.js';
import { getAircraft } from '../../../api/aircraft.js';
import { getGroundVehicles } from '../../../api/groundVehicles.js';
import { createOperation } from '../../../api/fuelingOperations.js';

const FUEL_LABELS = { jet_a1: 'Jet A-1', avgas: 'Avgas 100LL', diesel: 'Diesel', gasoline: 'Benzina' };

const NewOperationModal = ({ isOpen, onClose, onSaved }) => {
  const { t } = useTranslation();

  const [tanks, setTanks] = useState([]);
  const [aircraft, setAircraft] = useState([]);
  const [vehicles, setVehicles] = useState([]);
  const [loadingData, setLoadingData] = useState(false);

  const [form, setForm] = useState({
    operation_date: new Date().toISOString().slice(0, 16),
    source_type: 'tank',
    source_tank_id: '',
    external_source_name: '',
    dest_type: 'aircraft',
    dest_aircraft_id: '',
    dest_vehicle_id: '',
    dest_tank_id: '',
    liters: '',
    meter_reading_before: '',
    meter_reading_after: '',
    flight_hours_at_fueling: '',
    km_at_fueling: '',
    notes: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setForm({
      operation_date: new Date().toISOString().slice(0, 16),
      source_type: 'tank',
      source_tank_id: '',
      external_source_name: '',
      dest_type: 'aircraft',
      dest_aircraft_id: '',
      dest_vehicle_id: '',
      dest_tank_id: '',
      liters: '',
      meter_reading_before: '',
      meter_reading_after: '',
      flight_hours_at_fueling: '',
      km_at_fueling: '',
      notes: '',
    });
    setLoadingData(true);
    Promise.all([getTanks(), getAircraft(), getGroundVehicles()])
      .then(([t, a, v]) => { setTanks(t); setAircraft(a); setVehicles(v); })
      .catch(() => {})
      .finally(() => setLoadingData(false));
  }, [isOpen]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const sourceTank = tanks.find((t) => t.id === form.source_tank_id);

  // Filter dest options by fuel type compatibility
  const filteredAircraft = sourceTank
    ? aircraft.filter((a) => a.fuel_type === sourceTank.fuel_type)
    : aircraft;
  const filteredVehicles = sourceTank
    ? vehicles.filter((v) => v.fuel_type === sourceTank.fuel_type)
    : vehicles;
  const filteredDestTanks = sourceTank
    ? tanks.filter((t) => t.id !== sourceTank.id && t.fuel_type === sourceTank.fuel_type)
    : tanks;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        operation_date: new Date(form.operation_date).toISOString(),
        source_type: form.source_type,
        source_tank_id: form.source_type === 'tank' ? form.source_tank_id || null : null,
        external_source_name: form.source_type === 'external' ? form.external_source_name : null,
        dest_type: form.dest_type,
        dest_aircraft_id: form.dest_type === 'aircraft' ? form.dest_aircraft_id || null : null,
        dest_vehicle_id: form.dest_type === 'ground_vehicle' ? form.dest_vehicle_id || null : null,
        dest_tank_id: form.dest_type === 'tank' ? form.dest_tank_id || null : null,
        liters: form.liters ? parseFloat(form.liters) : null,
        meter_reading_before: form.meter_reading_before !== '' ? parseFloat(form.meter_reading_before) : null,
        meter_reading_after: form.meter_reading_after !== '' ? parseFloat(form.meter_reading_after) : null,
        flight_hours_at_fueling: form.dest_type === 'aircraft' && form.flight_hours_at_fueling !== ''
          ? parseFloat(form.flight_hours_at_fueling) : null,
        km_at_fueling: form.dest_type === 'ground_vehicle' && form.km_at_fueling !== ''
          ? parseFloat(form.km_at_fueling) : null,
        notes: form.notes.trim() || null,
      };
      await createOperation(payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const selectClass = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';
  const labelClass = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('operations.new')} size="lg">
      {loadingData ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5">
          {error && <Alert variant="error">{error}</Alert>}

          {/* Date */}
          <div>
            <label className={labelClass}>{t('operations.date')}</label>
            <input
              type="datetime-local"
              value={form.operation_date}
              onChange={set('operation_date')}
              required
              className={selectClass}
            />
          </div>

          {/* Source */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.source')}</p>

            <div className="flex gap-3">
              {[
                { value: 'tank', label: t('operations.source_tank'), icon: Gauge },
                { value: 'external', label: t('operations.source_external'), icon: Fuel },
              ].map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors text-sm font-medium ${
                    form.source_type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="source_type"
                    value={value}
                    checked={form.source_type === value}
                    onChange={set('source_type')}
                    className="sr-only"
                  />
                  <Icon size={15} />
                  {label}
                </label>
              ))}
            </div>

            {form.source_type === 'tank' ? (
              <div>
                <label className={labelClass}>{t('operations.select_tank')}</label>
                <select value={form.source_tank_id} onChange={set('source_tank_id')} required className={selectClass}>
                  <option value="">{t('operations.choose')}</option>
                  {tanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {FUEL_LABELS[t.fuel_type]} — {parseFloat(t.current_liters).toFixed(0)} L
                    </option>
                  ))}
                </select>
                {sourceTank && (
                  <p className="text-xs text-gray-500 mt-1">
                    {t('operations.available')}: <strong>{parseFloat(sourceTank.current_liters).toFixed(0)} L</strong>
                  </p>
                )}
              </div>
            ) : (
              <Input
                label={t('operations.external_source_name')}
                value={form.external_source_name}
                onChange={set('external_source_name')}
                placeholder={t('operations.external_source_placeholder')}
                required
              />
            )}
          </div>

          {/* Destination */}
          <div className="p-4 bg-gray-50 rounded-xl space-y-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">{t('operations.destination')}</p>

            <div className="flex gap-2 flex-wrap">
              {[
                { value: 'aircraft', label: t('aircraft.singular') || t('dashboard.aircraft'), icon: Plane },
                { value: 'ground_vehicle', label: t('vehicles.singular') || t('dashboard.vehicles'), icon: Truck },
                { value: 'tank', label: t('tanks.title'), icon: Gauge },
              ].map(({ value, label, icon: Icon }) => (
                <label
                  key={value}
                  className={`flex-1 flex items-center gap-2 px-3 py-2.5 rounded-lg border-2 cursor-pointer transition-colors text-sm font-medium min-w-24 ${
                    form.dest_type === value
                      ? 'border-blue-500 bg-blue-50 text-blue-700'
                      : 'border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  <input
                    type="radio"
                    name="dest_type"
                    value={value}
                    checked={form.dest_type === value}
                    onChange={set('dest_type')}
                    className="sr-only"
                  />
                  <Icon size={15} />
                  {label}
                </label>
              ))}
            </div>

            {form.dest_type === 'aircraft' && (
              <>
                <div>
                  <label className={labelClass}>{t('operations.select_aircraft')}</label>
                  <select value={form.dest_aircraft_id} onChange={set('dest_aircraft_id')} required className={selectClass}>
                    <option value="">{t('operations.choose')}</option>
                    {filteredAircraft.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.registration} — {a.model} ({FUEL_LABELS[a.fuel_type]})
                      </option>
                    ))}
                  </select>
                  {filteredAircraft.length === 0 && form.source_type === 'tank' && sourceTank && (
                    <p className="text-xs text-amber-600 mt-1">{t('operations.no_compatible_aircraft')}</p>
                  )}
                </div>
                <Input
                  label={`${t('aircraft.flight_hours')} (${t('operations.at_fueling')})`}
                  type="number"
                  min="0"
                  step="0.1"
                  value={form.flight_hours_at_fueling}
                  onChange={set('flight_hours_at_fueling')}
                  placeholder="1250.5"
                />
              </>
            )}

            {form.dest_type === 'ground_vehicle' && (
              <>
                <div>
                  <label className={labelClass}>{t('operations.select_vehicle')}</label>
                  <select value={form.dest_vehicle_id} onChange={set('dest_vehicle_id')} required className={selectClass}>
                    <option value="">{t('operations.choose')}</option>
                    {filteredVehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.plate} — {v.name} ({FUEL_LABELS[v.fuel_type]})
                      </option>
                    ))}
                  </select>
                  {filteredVehicles.length === 0 && form.source_type === 'tank' && sourceTank && (
                    <p className="text-xs text-amber-600 mt-1">{t('operations.no_compatible_vehicles')}</p>
                  )}
                </div>
                <Input
                  label={`${t('vehicles.total_km')} (${t('operations.at_fueling')})`}
                  type="number"
                  min="0"
                  step="1"
                  value={form.km_at_fueling}
                  onChange={set('km_at_fueling')}
                  placeholder="45000"
                />
              </>
            )}

            {form.dest_type === 'tank' && (
              <div>
                <label className={labelClass}>{t('operations.select_dest_tank')}</label>
                <select value={form.dest_tank_id} onChange={set('dest_tank_id')} required className={selectClass}>
                  <option value="">{t('operations.choose')}</option>
                  {filteredDestTanks.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code}) — {FUEL_LABELS[t.fuel_type]} — {parseFloat(t.current_liters).toFixed(0)}/{parseFloat(t.capacity_liters).toFixed(0)} L
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Quantity & meter */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label={`${t('operations.liters')} *`}
              type="number"
              min="0.1"
              step="0.1"
              value={form.liters}
              onChange={set('liters')}
              placeholder="0.0"
              required
            />
            <Input
              label={t('operations.meter_before')}
              type="number"
              min="0"
              step="0.01"
              value={form.meter_reading_before}
              onChange={set('meter_reading_before')}
              placeholder="—"
            />
            <Input
              label={t('operations.meter_after')}
              type="number"
              min="0"
              step="0.01"
              value={form.meter_reading_after}
              onChange={set('meter_reading_after')}
              placeholder="—"
            />
          </div>

          {/* Notes */}
          <div>
            <label className={labelClass}>{t('operations.notes')}</label>
            <textarea
              value={form.notes}
              onChange={set('notes')}
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" loading={loading}>
              <Fuel size={15} />
              {t('operations.save')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
};

export default NewOperationModal;
