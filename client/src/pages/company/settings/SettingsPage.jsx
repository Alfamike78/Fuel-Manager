import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Settings, Building2, Palette, MapPin, CreditCard,
  Upload, Trash2, Save, CheckCircle, AlertTriangle, Fuel,
  Users, Gauge, ArrowLeft, X
} from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Card from '../../../components/ui/Card.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import Modal from '../../../components/ui/Modal.jsx';
import { getBases, createBase, updateBase, deleteBase } from '../../../api/bases.js';
import {
  getCompanySettings, updateCompanySettings,
  uploadCompanyLogo, deleteCompanyLogo,
} from '../../../api/companySettings.js';
import { useAuth } from '../../../hooks/useAuth.js';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';

// ─── Color Swatch Picker ─────────────────────────────────────────────────────
const PRESET_COLORS = [
  '#1e40af', '#1d4ed8', '#2563eb', '#3b82f6',
  '#0f766e', '#0891b2', '#7c3aed', '#9333ea',
  '#be123c', '#dc2626', '#ea580c', '#d97706',
  '#15803d', '#16a34a', '#374151', '#1f2937',
];

const ColorPicker = ({ label, value, onChange }) => {
  const inputRef = useRef(null);
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">{label}</label>
      <div className="flex items-center gap-3 mb-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="w-10 h-10 rounded-xl border-2 border-gray-200 shadow-sm flex-shrink-0 transition-transform hover:scale-110"
          style={{ backgroundColor: value }}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="#1e40af"
          maxLength={7}
          className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <input
          ref={inputRef}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="sr-only"
        />
      </div>
      <div className="flex flex-wrap gap-2">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            type="button"
            onClick={() => onChange(c)}
            className={clsx(
              'w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110',
              value === c ? 'border-gray-800 scale-110' : 'border-transparent'
            )}
            style={{ backgroundColor: c }}
          />
        ))}
      </div>
    </div>
  );
};

// ─── Sidebar Preview ──────────────────────────────────────────────────────────
const SidebarPreview = ({ name, logoUrl, primaryColor, secondaryColor }) => (
  <div
    className="rounded-xl overflow-hidden shadow-lg w-48 flex-shrink-0"
    style={{ backgroundColor: primaryColor || '#1e3a8a' }}
  >
    <div className="flex items-center gap-2 px-3 py-3 border-b border-white/10">
      {logoUrl ? (
        <img src={logoUrl} alt="logo" className="w-8 h-8 object-contain rounded-lg bg-white/10 p-1" />
      ) : (
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: secondaryColor || '#3b82f6' }}
        >
          <Fuel size={16} className="text-white" />
        </div>
      )}
      <div className="min-w-0">
        <p className="text-white font-bold text-xs leading-tight truncate">{name || 'Company'}</p>
        <p className="text-white/50 text-[10px] leading-tight">PilotCraft</p>
      </div>
    </div>
    <div className="px-2 py-2 space-y-1">
      {['Operazioni', 'Cisterne', 'Report', 'Utenti'].map((item, i) => (
        <div
          key={item}
          className={clsx(
            'flex items-center gap-2 px-2 py-1.5 rounded-md text-[11px] font-medium',
            i === 0 ? 'text-white' : 'text-white/50'
          )}
          style={i === 0 ? { backgroundColor: secondaryColor || '#3b82f6' } : {}}
        >
          <div className="w-3 h-3 rounded-sm bg-current opacity-70" />
          {item}
        </div>
      ))}
    </div>
  </div>
);

// ─── General Tab ──────────────────────────────────────────────────────────────
const GeneralTab = ({ settings, onSaved }) => {
  const { t } = useTranslation();
  const { updateUser, user } = useAuth();
  const fileInputRef = useRef(null);

  const [form, setForm] = useState({ name: '', primary_color: '#1e40af', secondary_color: '#3b82f6' });
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoFile, setLogoFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (settings) {
      setForm({
        name: settings.name || '',
        primary_color: settings.primary_color || '#1e40af',
        secondary_color: settings.secondary_color || '#3b82f6',
      });
      setLogoPreview(settings.logo_url ? `http://localhost:3001${settings.logo_url}` : null);
    }
  }, [settings]);

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLogoFile(file);
    setLogoPreview(URL.createObjectURL(file));
  };

  const handleRemoveLogo = async () => {
    if (settings?.logo_url) {
      setUploadingLogo(true);
      try {
        await deleteCompanyLogo();
        onSaved();
      } catch (_) {}
      setUploadingLogo(false);
    }
    setLogoFile(null);
    setLogoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      // Upload logo if a new file was selected
      if (logoFile) {
        setUploadingLogo(true);
        await uploadCompanyLogo(logoFile);
        setLogoFile(null);
        setUploadingLogo(false);
      }

      const updated = await updateCompanySettings(form);
      updateUser({ company_name: updated.name });
      setSuccess(true);
      onSaved();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setSaving(false);
    }
  };

  const currentLogoUrl = logoPreview;

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form fields */}
        <div className="lg:col-span-2 space-y-6">
          {success && (
            <Alert variant="success">
              <CheckCircle size={15} className="inline mr-1" />
              {t('settings.saved_success')}
            </Alert>
          )}
          {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

          {/* Company name */}
          <Card>
            <Card.Header><Card.Title>{t('settings.company_info')}</Card.Title></Card.Header>
            <Card.Body className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('settings.company_name')} *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                  placeholder="My Aviation Company"
                  required
                />
              </div>

              {/* Logo upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('settings.logo')}
                </label>
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden bg-gray-50 flex-shrink-0">
                    {currentLogoUrl ? (
                      <img src={currentLogoUrl} alt="logo" className="w-full h-full object-contain p-1" />
                    ) : (
                      <Building2 size={28} className="text-gray-300" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-gray-500">{t('settings.logo_hint')}</p>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <Upload size={14} />
                        {t('settings.upload_logo')}
                      </button>
                      {currentLogoUrl && (
                        <button
                          type="button"
                          onClick={handleRemoveLogo}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                          {t('common.remove')}
                        </button>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".png,.jpg,.jpeg,.svg,.webp"
                      onChange={handleLogoChange}
                      className="hidden"
                    />
                    {logoFile && (
                      <p className="text-xs text-green-600 font-medium">
                        {logoFile.name} — {t('settings.will_save_on_submit')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </Card.Body>
          </Card>

          {/* Brand colors */}
          <Card>
            <Card.Header><Card.Title>{t('settings.brand_colors')}</Card.Title></Card.Header>
            <Card.Body className="space-y-6">
              <ColorPicker
                label={t('settings.primary_color')}
                value={form.primary_color}
                onChange={(v) => setForm((p) => ({ ...p, primary_color: v }))}
              />
              <ColorPicker
                label={t('settings.secondary_color')}
                value={form.secondary_color}
                onChange={(v) => setForm((p) => ({ ...p, secondary_color: v }))}
              />
            </Card.Body>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" loading={saving || uploadingLogo}>
              <Save size={15} />
              {t('common.save_changes')}
            </Button>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <p className="text-sm font-semibold text-gray-700">{t('settings.preview')}</p>
          <SidebarPreview
            name={form.name}
            logoUrl={currentLogoUrl}
            primaryColor={form.primary_color}
            secondaryColor={form.secondary_color}
          />
          <p className="text-xs text-gray-400">{t('settings.preview_note')}</p>
        </div>
      </div>
    </form>
  );
};

// ─── Bases Tab (embedded) ─────────────────────────────────────────────────────
const DEFAULT_BASE_FORM = { name: '', location: '' };

const BasesTab = () => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = ['admin', 'superadmin'].includes(user?.role);
  const [bases, setBases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modal, setModal] = useState({ open: false, base: null });
  const [form, setForm] = useState(DEFAULT_BASE_FORM);
  const [formLoading, setFormLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  const fetchBases = useCallback(async () => {
    setLoading(true);
    try {
      setBases(await getBases());
    } catch (_) {
      setError(t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => { fetchBases(); }, [fetchBases]);

  useEffect(() => {
    if (modal.open) {
      setForm(modal.base ? { name: modal.base.name, location: modal.base.location || '' } : DEFAULT_BASE_FORM);
    }
  }, [modal]);

  const handleSave = async (e) => {
    e.preventDefault();
    setFormLoading(true);
    try {
      if (modal.base) await updateBase(modal.base.id, form);
      else await createBase(form);
      setModal({ open: false, base: null });
      fetchBases();
    } catch (err) {
      setError(err.response?.data?.error || t('common.error'));
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await deleteBase(confirmDelete.id);
      setConfirmDelete(null);
      fetchBases();
    } catch (_) {}
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error" onClose={() => setError(null)}>{error}</Alert>}

      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{bases.length} {t('bases.title').toLowerCase()}</p>
        {isAdmin && (
          <Button size="sm" onClick={() => setModal({ open: true, base: null })}>
            + {t('bases.add')}
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : bases.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-gray-400">
          <MapPin size={40} className="mb-3 opacity-30" />
          <p className="text-gray-500 font-medium">{t('bases.empty')}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {bases.map((base) => (
            <div key={base.id} className="bg-white rounded-xl border border-gray-200 p-4 flex items-start justify-between hover:shadow-sm transition-shadow">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <MapPin size={16} className="text-blue-600" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate">{base.name}</p>
                  {base.location && <p className="text-xs text-gray-500 truncate">{base.location}</p>}
                  <p className="text-xs text-gray-400 mt-0.5">{base.tanks_count || 0} {t('dashboard.tanks').toLowerCase()}</p>
                </div>
              </div>
              {isAdmin && (
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => setModal({ open: true, base })}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <Settings size={14} />
                  </button>
                  <button
                    onClick={() => setConfirmDelete(base)}
                    className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Base form modal */}
      <Modal isOpen={modal.open} onClose={() => setModal({ open: false, base: null })} title={modal.base ? t('bases.edit') : t('bases.add')} size="sm">
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('common.name')} *</label>
            <Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">{t('bases.location')}</label>
            <Input value={form.location} onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <Button type="button" variant="outline" onClick={() => setModal({ open: false, base: null })}>{t('common.cancel')}</Button>
            <Button type="submit" loading={formLoading}>{t('common.save')}</Button>
          </div>
        </form>
      </Modal>

      {/* Delete confirm */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50" onClick={() => setConfirmDelete(null)} />
          <div className="relative bg-white rounded-2xl p-6 max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-gray-900 mb-2">{t('bases.delete_confirm')}</h3>
            <p className="text-sm text-gray-500 mb-5">{confirmDelete.name}</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setConfirmDelete(null)}>{t('common.cancel')}</Button>
              <Button variant="danger" onClick={handleDelete}>{t('common.delete')}</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Plan Tab ─────────────────────────────────────────────────────────────────
const PlanTab = ({ settings }) => {
  const { t } = useTranslation();
  if (!settings) return null;

  const stats = [
    { icon: Gauge, label: t('dashboard.tanks'), used: settings.tanks_count, max: settings.max_tanks },
    { icon: Users, label: t('users.title'), used: settings.users_count, max: settings.max_users },
  ];

  const trialDaysLeft = settings.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(settings.trial_ends_at) - Date.now()) / 86400000))
    : null;

  return (
    <div className="space-y-6">
      {/* Plan card */}
      <Card>
        <Card.Header>
          <div className="flex items-start justify-between">
            <div>
              <Card.Title>{t('settings.current_plan')}</Card.Title>
              <p className="text-sm text-gray-500 mt-0.5">{t('settings.plan_desc')}</p>
            </div>
            <span className={clsx(
              'px-3 py-1 rounded-full text-sm font-semibold',
              settings.status === 'active' ? 'bg-green-100 text-green-700' :
              settings.status === 'trial' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            )}>
              {settings.status}
            </span>
          </div>
        </Card.Header>
        <Card.Body>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-4xl font-bold text-gray-900">{settings.plan_name || 'Trial'}</span>
            {settings.price_monthly > 0 && (
              <span className="text-gray-500">€{settings.price_monthly}/mo</span>
            )}
          </div>

          {settings.status === 'trial' && trialDaysLeft !== null && (
            <div className="flex items-start gap-3 p-4 bg-yellow-50 border border-yellow-200 rounded-xl mb-6">
              <AlertTriangle size={16} className="text-yellow-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                {t('settings.trial_expires', { days: trialDaysLeft })}
              </p>
            </div>
          )}

          <div className="space-y-4">
            {stats.map(({ icon: Icon, label, used, max }) => (
              <div key={label}>
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                    <Icon size={14} className="text-gray-400" />
                    {label}
                  </div>
                  <span className="text-sm text-gray-500">
                    {used} / {max == null ? '∞' : max}
                  </span>
                </div>
                {max != null && (
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={clsx('h-full rounded-full transition-all', parseInt(used) / max > 0.8 ? 'bg-red-400' : 'bg-blue-500')}
                      style={{ width: `${Math.min(100, (parseInt(used) / max) * 100)}%` }}
                    />
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 pt-5 border-t border-gray-100 grid grid-cols-2 gap-3">
            {[
              { label: 'Export PDF', ok: settings.can_export_pdf },
              { label: 'Export Excel', ok: settings.can_export_excel },
              { label: 'Import dati', ok: settings.can_import },
              { label: 'Utenti illimitati', ok: settings.max_users == null },
            ].map(({ label, ok }) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <CheckCircle size={14} className={ok ? 'text-green-500' : 'text-gray-300'} />
                <span className={ok ? 'text-gray-700' : 'text-gray-400'}>{label}</span>
              </div>
            ))}
          </div>
        </Card.Body>
      </Card>

      <div className="text-center">
        <p className="text-sm text-gray-500 mb-3">{t('settings.upgrade_hint')}</p>
        <button className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors text-sm">
          {t('settings.upgrade_plan')} →
        </button>
      </div>
    </div>
  );
};

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { key: 'general', labelKey: 'settings.tab_general', icon: Building2 },
  { key: 'bases', labelKey: 'settings.tab_bases', icon: MapPin },
  { key: 'plan', labelKey: 'settings.tab_plan', icon: CreditCard },
];

const SettingsPage = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [tab, setTab] = useState('general');
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = useCallback(async () => {
    try {
      setSettings(await getCompanySettings());
    } catch (_) {} finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchSettings(); }, [fetchSettings]);

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings size={22} />
              {t('settings.title')}
            </h1>
            <p className="text-gray-500 text-sm mt-0.5">{settings?.name || ''}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 p-1 bg-gray-100 rounded-xl w-fit">
          {TABS.map(({ key, labelKey, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={clsx(
                'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                tab === key ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'
              )}
            >
              <Icon size={15} />
              {t(labelKey)}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {tab === 'general' && <GeneralTab settings={settings} onSaved={fetchSettings} />}
            {tab === 'bases' && <BasesTab />}
            {tab === 'plan' && <PlanTab settings={settings} />}
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default SettingsPage;
