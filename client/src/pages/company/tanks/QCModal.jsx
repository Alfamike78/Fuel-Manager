import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Modal from '../../../components/ui/Modal.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { createQualityCheck } from '../../../api/qualityChecks.js';

const toLocalDatetimeValue = (date = new Date()) => {
  const d = new Date(date);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
};

const QCModal = ({ isOpen, onClose, tank, onSaved }) => {
  const { t } = useTranslation();
  const [form, setForm] = useState({
    check_date: toLocalDatetimeValue(),
    liters_drained: '',
    is_compliant: true,
    notes: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm({
        check_date: toLocalDatetimeValue(),
        liters_drained: '',
        is_compliant: true,
        notes: '',
      });
      setError(null);
    }
  }, [isOpen]);

  const handleChange = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const setCompliant = (val) => {
    setForm((prev) => ({ ...prev, is_compliant: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.is_compliant && !form.notes.trim()) {
      setError(t('qc.notes_required'));
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await createQualityCheck({
        check_date: new Date(form.check_date).toISOString(),
        subject_type: 'tank',
        tank_id: tank.id,
        liters_drained: parseFloat(form.liters_drained) || 0,
        is_compliant: form.is_compliant,
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

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={t('qc.title')} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}

        {/* Tank info */}
        <div className="bg-gray-50 rounded-lg px-4 py-3">
          <p className="text-xs font-medium text-gray-500 mb-1">Tank</p>
          <p className="text-sm font-semibold text-gray-900">
            {tank?.name}{' '}
            <span className="font-normal text-gray-500">({tank?.code})</span>
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('qc.date')} *
          </label>
          <Input
            type="datetime-local"
            value={form.check_date}
            onChange={handleChange('check_date')}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('qc.liters_drained')} *
          </label>
          <Input
            type="number"
            min="0"
            step="0.01"
            value={form.liters_drained}
            onChange={handleChange('liters_drained')}
            placeholder="2.5"
            required
          />
        </div>

        {/* Compliant toggle */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Result *</label>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setCompliant(true)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                form.is_compliant
                  ? 'border-green-500 bg-green-50 text-green-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <CheckCircle size={16} />
              {t('qc.compliant')}
            </button>
            <button
              type="button"
              onClick={() => setCompliant(false)}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border-2 text-sm font-semibold transition-colors ${
                !form.is_compliant
                  ? 'border-red-500 bg-red-50 text-red-700'
                  : 'border-gray-200 text-gray-500 hover:border-gray-300'
              }`}
            >
              <AlertTriangle size={16} />
              {t('qc.not_compliant')}
            </button>
          </div>
        </div>

        {/* Compliance preview banner */}
        {form.is_compliant ? (
          <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-100 rounded-lg">
            <CheckCircle size={18} className="text-green-600 flex-shrink-0" />
            <p className="text-sm text-green-700 font-medium">Check passed — fuel is clear and compliant</p>
          </div>
        ) : (
          <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-100 rounded-lg">
            <AlertTriangle size={18} className="text-red-600 flex-shrink-0" />
            <p className="text-sm text-red-700 font-medium">Non-compliant result — notes are required below</p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Notes {!form.is_compliant && <span className="text-red-500">*</span>}
          </label>
          <textarea
            value={form.notes}
            onChange={handleChange('notes')}
            rows={3}
            required={!form.is_compliant}
            className={`w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 resize-none ${
              !form.is_compliant
                ? 'border-red-300 focus:ring-red-500'
                : 'border-gray-300 focus:ring-blue-500'
            }`}
            placeholder={
              !form.is_compliant
                ? t('qc.actions_taken')
                : 'Optional observations...'
            }
          />
          {!form.is_compliant && (
            <p className="text-xs text-red-500 mt-1">{t('qc.notes_required')}</p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" loading={loading}>
            {t('tanks.qc_check')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};

export default QCModal;
