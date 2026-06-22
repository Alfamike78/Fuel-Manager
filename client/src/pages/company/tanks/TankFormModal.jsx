import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createTank, updateTank } from '../../../api/tanks.js';

const FUEL_TYPES = [
  { value: 'jet_a1', labelKey: 'fuel.jet_a1', color: '#1a1a1a' },
  { value: 'avgas', labelKey: 'fuel.avgas', color: '#dc2626' },
  { value: 'diesel', labelKey: 'fuel.diesel', color: '#16a34a' },
  { value: 'gasoline', labelKey: 'fuel.gasoline', color: '#ca8a04' },
];

const DEFAULT_FORM = {
  name: '',
  code: '',
  tank_type: 'fixed',
  fuel_type: 'jet_a1',
  base_id: '',
  capacity_liters: '',
  current_liters: '0',
  min_threshold_liters: '',
  instructions: '',
};

const TankFormModal = ({ isOpen, onClose, tank, bases, onSaved }) => {
  const { t } = useTranslation();
  const isEdit = Boolean(tank);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (tank) {
        setForm({
          name: tank.name || '',
          code: tank.code || '',
          tank_type: tank.tank_type || 'fixed',
          fuel_type: tank.fuel_type || 'jet_a1',
          base_id: tank.base_id || '',
          capacity_liters: tank.capacity_liters || '',
          current_liters: tank.current_liters || '0',
          min_threshold_liters: tank.min_threshold_liters || '',
          instructions: tank.instructions || '',
        });
      } else {
        setForm(DEFAULT_FORM);
      }
      setError(null);
    }
  }, [isOpen, tank]);

  const selectedFuelType = FUEL_TYPES.find((f) => f.value === form.fuel_type);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        name: form.name,
        code: form.code,
        tank_type: form.tank_type,
        fuel_type: form.fuel_type,
        base_id: form.base_id || undefined,
        capacity_liters: parseFloat(form.capacity_liters),
        min_threshold_liters: form.min_threshold_liters ? parseFloat(form.min_threshold_liters) : undefined,
        instructions: form.instructions || undefined,
      };
      if (!isEdit) {
        payload.current_liters = parseFloat(form.current_liters) || 0;
      }

      if (isEdit) {
        await updateTank(tank.id, payload);
      } else {
        await createTank(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? t('tanks.edit') : t('tanks.add')}
      size="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('common.name')} *
            </label>
            <Input
              value={form.name}
              onChange={handleChange('name')}
              placeholder="Main Tank"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tanks.code')} *
            </label>
            <Input
              value={form.code}
              onChange={handleChange('code')}
              placeholder="TK-001"
              required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tanks.type')} *
            </label>
            <select
              value={form.tank_type}
              onChange={handleChange('tank_type')}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="fixed">{t('tanks.fixed')}</option>
              <option value="mobile">{t('tanks.mobile')}</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('fuel.jet_a1').replace('Jet A-1', 'Fuel Type')} *
            </label>
            <div className="flex items-center gap-2">
              <select
                value={form.fuel_type}
                onChange={handleChange('fuel_type')}
                disabled={isEdit}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
              >
                {FUEL_TYPES.map((ft) => (
                  <option key={ft.value} value={ft.value}>
                    {t(ft.labelKey)}
                  </option>
                ))}
              </select>
              <div
                className="w-8 h-8 rounded-lg flex-shrink-0 border border-gray-200"
                style={{ backgroundColor: selectedFuelType?.color }}
                title={selectedFuelType ? t(selectedFuelType.labelKey) : ''}
              />
            </div>
            {isEdit && (
              <p className="text-xs text-gray-400 mt-1">Fuel type cannot be changed after creation.</p>
            )}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('bases.title')}
          </label>
          <select
            value={form.base_id}
            onChange={handleChange('base_id')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('tanks.no_base')}</option>
            {bases.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tanks.capacity')} *
            </label>
            <Input
              type="number"
              min="1"
              step="0.01"
              value={form.capacity_liters}
              onChange={handleChange('capacity_liters')}
              placeholder="5000"
              required
            />
          </div>
          {!isEdit && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('tanks.current_level')}
              </label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={form.current_liters}
                onChange={handleChange('current_liters')}
                placeholder="0"
              />
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {t('tanks.threshold')}
            </label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={form.min_threshold_liters}
              onChange={handleChange('min_threshold_liters')}
              placeholder="500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('tanks.instructions')}
          </label>
          <textarea
            value={form.instructions}
            onChange={handleChange('instructions')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Operational notes..."
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {isEdit ? t('common.save') : t('tanks.add')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default TankFormModal;
