import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createAircraft, updateAircraft } from '../../../api/aircraft.js';

const FUEL_TYPES = ['jet_a1', 'avgas'];

const AircraftFormModal = ({ isOpen, onClose, aircraft, onSaved }) => {
  const { t } = useTranslation();

  const [form, setForm] = useState({
    registration: '',
    model: '',
    fuel_type: 'jet_a1',
    total_flight_hours: '',
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      if (aircraft) {
        setForm({
          registration: aircraft.registration || '',
          model: aircraft.model || '',
          fuel_type: aircraft.fuel_type || 'jet_a1',
          total_flight_hours: aircraft.total_flight_hours ?? '',
          notes: aircraft.notes || '',
        });
      } else {
        setForm({ registration: '', model: '', fuel_type: 'jet_a1', total_flight_hours: '', notes: '' });
      }
      setError(null);
    }
  }, [isOpen, aircraft]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        registration: form.registration.trim(),
        model: form.model.trim(),
        fuel_type: form.fuel_type,
        total_flight_hours: form.total_flight_hours !== '' ? parseFloat(form.total_flight_hours) : 0,
        notes: form.notes.trim() || null,
      };
      if (aircraft) {
        await updateAircraft(aircraft.id, payload);
      } else {
        await createAircraft(payload);
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
      title={aircraft ? t('aircraft.edit') : t('aircraft.add')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        <Input
          label={t('aircraft.registration')}
          value={form.registration}
          onChange={set('registration')}
          placeholder="I-ABCD"
          required
          className="uppercase"
        />

        <Input
          label={t('aircraft.model')}
          value={form.model}
          onChange={set('model')}
          placeholder="AgustaWestland AW139"
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
          label={t('aircraft.flight_hours')}
          type="number"
          min="0"
          step="0.1"
          value={form.total_flight_hours}
          onChange={set('total_flight_hours')}
          placeholder="0.0"
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

export default AircraftFormModal;
