import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { User, Lock, Globe } from 'lucide-react';
import AdminLayout from '../../../components/layout/AdminLayout.jsx';
import Button from '../../../components/ui/Button.jsx';
import Input from '../../../components/ui/Input.jsx';
import Alert from '../../../components/ui/Alert.jsx';
import { useAuth } from '../../../hooks/useAuth.js';
import api from '../../../api/index.js';

const LANGUAGES = [
  { code: 'it', label: 'Italiano' },
  { code: 'en', label: 'English' },
  { code: 'tr', label: 'Türkçe' },
  { code: 'es', label: 'Español' },
];

const ProfilePage = () => {
  const { t, i18n } = useTranslation();
  const { user, updateUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name || '');
  const [lastName, setLastName] = useState(user?.last_name || '');
  const [language, setLanguage] = useState(user?.language || 'it');

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [profileError, setProfileError] = useState(null);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPassword2, setNewPassword2] = useState('');
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwError, setPwError] = useState(null);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess(false);
    setProfileError(null);
    try {
      const res = await api.patch('/profile', { first_name: firstName, last_name: lastName, language });
      updateUser({ first_name: res.data.first_name, last_name: res.data.last_name, language: res.data.language });
      i18n.changeLanguage(res.data.language);
      setProfileSuccess(true);
    } catch (err) {
      setProfileError(err.response?.data?.error || t('common.error'));
    } finally {
      setProfileLoading(false);
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPwSuccess(false);
    setPwError(null);

    if (newPassword !== newPassword2) {
      setPwError(t('users.passwords_mismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setPwError(t('auth.password_min'));
      return;
    }

    setPwLoading(true);
    try {
      await api.patch('/profile/password', {
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPwSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setNewPassword2('');
    } catch (err) {
      setPwError(err.response?.data?.error || t('common.error'));
    } finally {
      setPwLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-gray-500 text-sm mt-1">{t('profile.subtitle')}</p>
        </div>

        {/* Personal info */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <User size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('profile.personal_info')}</h2>
          </div>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            {profileError && <Alert type="error" message={profileError} />}
            {profileSuccess && <Alert type="success" message={t('profile.saved')} />}

            <div className="grid grid-cols-2 gap-4">
              <Input
                label={t('auth.first_name')}
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
              <Input
                label={t('auth.last_name')}
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>

            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{t('auth.email')}</p>
              <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
                {user?.email}
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
                <Globe size={14} />
                {t('profile.language')}
              </label>
              <select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
              >
                {LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>{l.label}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={profileLoading}>
                {t('common.save')}
              </Button>
            </div>
          </form>
        </div>

        {/* Password */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Lock size={18} className="text-blue-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">{t('profile.change_password')}</h2>
          </div>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            {pwError && <Alert type="error" message={pwError} />}
            {pwSuccess && <Alert type="success" message={t('profile.password_saved')} />}

            <Input
              label={t('profile.current_password')}
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
            <Input
              label={t('profile.new_password')}
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder={t('auth.password_placeholder')}
              required
            />
            <Input
              label={t('users.confirm_password')}
              type="password"
              value={newPassword2}
              onChange={(e) => setNewPassword2(e.target.value)}
              placeholder={t('auth.password_placeholder')}
              required
            />

            <div className="flex justify-end pt-2">
              <Button type="submit" loading={pwLoading}>
                {t('profile.update_password')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
};

export default ProfilePage;
