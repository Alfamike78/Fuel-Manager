import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, MapPin, Pencil, Trash2 } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { getBases, createBase, updateBase, deleteBase } from '../../../api/bases.js';
import { useAuth } from '../../../hooks/useAuth.js';

const DEFAULT_FORM = { name: '', location: '' };

const BaseFormModal = ({ isOpen, onClose, base, onSaved }) => {
  const { t } = useTranslation();
  const isEdit = Boolean(base);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setForm(base ? { name: base.name, location: base.location || '' } : DEFAULT_FORM);
      setError(null);
    }
  }, [isOpen, base]);

  const handleChange = (field) => (e) => setForm((p) => ({ ...p, [field]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isEdit) {
        await updateBase(base.id, form);
      } else {
        await createBase(form);
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
      title={isEdit ? t('bases.add').replace('Add', 'Edit') : t('bases.add')}
      size="sm"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && <Alert variant="error">{error}</Alert>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('common.name')} *
          </label>
          <Input
            value={form.name}
            onChange={handleChange('name')}
            placeholder="Rome Ciampino"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('bases.location')}
          </label>
          <Input
            value={form.location}
            onChange={handleChange('location')}
            placeholder="Via dell'Aeroporto 1, Roma"
          />
        </div>
        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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

const BasesPage = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);

  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, base: null });
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchBases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getBases();
      setBases(data);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    fetchBases();
  }, [fetchBases]);

  const handleDelete = async (base) => {
    try {
      await deleteBase(base.id);
      setConfirmDelete(null);
      fetchBases();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('bases.title')}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {bases.length} {bases.length === 1 ? 'base' : 'bases'}
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => setModal({ open: true, base: null })}>
              <Plus size={16} />
              {t('bases.add')}
            </Button>
          )}
        </div>

        {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

        {/* Bases grid */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : bases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <MapPin size={48} className="mb-3 opacity-30" />
            <p className="font-medium text-gray-500">No bases configured</p>
            {isAdmin && (
              <Button className="mt-4" onClick={() => setModal({ open: true, base: null })}>
                <Plus size={15} />
                {t('bases.add')}
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {bases.map((base) => (
              <div
                key={base.id}
                className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <MapPin size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="font-bold text-gray-900 truncate">{base.name}</h3>
                      {base.location && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{base.location}</p>
                      )}
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 ml-2 flex-shrink-0">
                      <button
                        onClick={() => setModal({ open: true, base })}
                        className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <Pencil size={15} />
                      </button>
                      <button
                        onClick={() => setConfirmDelete(base)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-100 flex items-center gap-1.5">
                  <span className="text-2xl font-bold text-gray-900">
                    {base.tanks_count || 0}
                  </span>
                  <span className="text-sm text-gray-500">{t('bases.tanks_count')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Delete Base</h3>
            <p className="text-sm text-gray-500 mb-6">
              Are you sure you want to delete <strong>{confirmDelete.name}</strong>?
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

      <BaseFormModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, base: null })}
        base={modal.base}
        onSaved={fetchBases}
      />
    </AdminLayout>
  );
};

export default BasesPage;
