import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createTankLoad } from '../../../api/tankLoads.js';

const toLocalDatetimeValue = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const AddLoadModal = ({ isOpen, onClose, tank, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    load_date: toLocalDatetimeValue(),
    provider_name: '',
    liters: '',
    delivery_note: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        load_date: toLocalDatetimeValue(),
        provider_name: '',
        liters: '',
        delivery_note: '',
        notes: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const currentLiters = parseFloat(tank?.current_liters) || 0;
  const capacity = parseFloat(tank?.capacity_liters) || 0;
  const litersInput = parseFloat(form.liters) || 0;
  const afterLoad = currentLiters + litersInput;
  const available = capacity - currentLiters;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.liters || parseFloat(form.liters) <= 0) {
      setError('Liters must be greater than 0');
      return;
    }
    if (afterLoad > capacity) {
      setError(`Load would exceed capacity. Available: ${available.toFixed(0)} L`);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createTankLoad({
        tank_id: tank.id,
        load_date: new Date(form.load_date).toISOString(),
        provider_name: form.provider_name || undefined,
        liters: parseFloat(form.liters),
        delivery_note: form.delivery_note || undefined,
        notes: form.notes || undefined,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n) => Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 });

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('loads.title')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Tank info (read-only) */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Tank</p>
          <p className="text-sm font-semibold text-gray-900">
            {tank?.name}{' '}
            <span className="font-normal text-gray-500">({tank?.code})</span>
          </p>
        </div>

        {/* Level preview */}
        <div className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-gray-600">Current:</span>
            <span className="font-semibold text-gray-900">{fmt(currentLiters)} L</span>
          </div>
          {litersInput > 0 && (
            <div className="flex justify-between">
              <span className="text-gray-600">{t('loads.after_load')}:</span>
              <span className={`font-semibold ${afterLoad > capacity ? 'text-red-600' : 'text-green-600'}`}>
                {fmt(afterLoad)} L
              </span>
            </div>
          )}
          <div className="flex justify-between border-t border-blue-100 pt-1 mt-1">
            <span className="text-gray-600">{t('tanks.capacity')}:</span>
            <span className="font-semibold text-gray-900">{fmt(capacity)} L</span>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loads.date')} *
          </label>
          <Input
            type="datetime-local"
            value={form.load_date}
            onChange={handleChange('load_date')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loads.provider')}
          </label>
          <Input
            value={form.provider_name}
            onChange={handleChange('provider_name')}
            placeholder="Shell Aviation / Mobil..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loads.liters')} *
          </label>
          <Input
            type="number"
            min="0.01"
            step="0.01"
            value={form.liters}
            onChange={handleChange('liters')}
            placeholder="1000"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('loads.delivery_note')}
          </label>
          <Input
            value={form.delivery_note}
            onChange={handleChange('delivery_note')}
            placeholder="DDT-2024-001"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.search').replace('Search', 'Notes')}
          </label>
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            rows={2}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Optional notes..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('tanks.add_load')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default AddLoadModal;
