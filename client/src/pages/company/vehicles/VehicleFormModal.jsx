import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createGroundVehicle, updateGroundVehicle } from '../../../api/groundVehicles.js';

const FUEL_TYPES = ['diesel', 'gasoline'];

const VehicleFormModal = ({ isOpen, onClose, vehicle, onSaved }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    plate: '',
    name: '',
    fuel_type: 'diesel',
    total_km: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (vehicle) {
        setForm({
          plate: vehicle.plate || '',
          name: vehicle.name || '',
          fuel_type: vehicle.fuel_type || 'diesel',
          total_km: vehicle.total_km ?? '',
          notes: vehicle.notes || '',
        });
      } else {
        setForm({ plate: '', name: '', fuel_type: 'diesel', total_km: '', notes: '' });
      }
      setError(null);
    }
  }, [isOpen, vehicle]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        plate: form.plate.trim(),
        name: form.name.trim(),
        fuel_type: form.fuel_type,
        total_km: form.total_km !== '' ? parseFloat(form.total_km) : 0,
        notes: form.notes.trim() || null,
      };
      if (vehicle) {
        await updateGroundVehicle(vehicle.id, payload);
      } else {
        await createGroundVehicle(payload);
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
      title={vehicle ? t('vehicles.edit') : t('vehicles.add')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label={t('vehicles.plate')}
          value={form.plate}
          onChange={set('plate')}
          placeholder="AB 123 CD"
          required
          className="uppercase"
        />

        <Input
          label={t('vehicles.name')}
          value={form.name}
          onChange={set('name')}
          placeholder="Toyota Land Cruiser"
          required
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('aircraft.fuel_type')}
          </label>
          <select
            value={form.fuel_type}
            onChange={set('fuel_type')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {FUEL_TYPES.map((ft) => (
              <option key={ft} value={ft}>{t(`fuel.${ft}`)}</option>
            ))}
          </select>
        </div>

        <Input
          label={t('vehicles.total_km')}
          type="number"
          min="0"
          step="1"
          value={form.total_km}
          onChange={set('total_km')}
          placeholder="0"
        />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.notes', 'Note')}
          </label>
          <textarea
            value={form.notes}
            onChange={set('notes')}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        <div className="flex gap-3 justify-end pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('common.save')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default VehicleFormModal;
