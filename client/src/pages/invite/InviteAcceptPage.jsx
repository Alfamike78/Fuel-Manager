import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fuel, CheckCircle } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import { useAuth } from '../../hooks/useAuth.js';
import { getInviteInfo, acceptInvite } from '../../api/users.js';

const InviteAcceptPage = () => {
  const { token } = useParams();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginWithToken } = useAuth();

  const [invite, setInvite] = useState(null);
  const [loadingInvite, setLoadingInvite] = useState(true);
  const [inviteError, setInviteError] = useState(null);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    const verify = async () => {
      try {
        const res = await getInviteInfo(token);
        setInvite(res.data);
      } catch (err) {
        setInviteError(err.response?.data?.error || t('common.error'));
      } finally {
        setLoadingInvite(false);
      }
    };
    verify();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError(null);

    if (password !== password2) {
      setFormError(t('users.passwords_mismatch'));
      return;
    }
    if (password.length < 8) {
      setFormError(t('auth.password_min'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await acceptInvite(token, {
        first_name: firstName,
        last_name: lastName,
        password,
      });
      loginWithToken(res.data.token, res.data.user);
      navigate('/dashboard');
    } catch (err) {
      setFormError(err.response?.data?.error || t('common.error'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-950 via-blue-900 to-blue-800 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center">
            <Fuel size={24} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-xl leading-tight">Fuel Manager</p>
            <p className="text-blue-300 text-sm">PilotCraft Solutions</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {loadingInvite ? (
            <div className="flex justify-center py-8">
              <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : inviteError ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-red-500 text-2xl">✕</span>
              </div>
              <h2 className="text-lg font-semibold text-gray-900 mb-2">{t('users.invite_invalid_title')}</h2>
              <p className="text-gray-500 text-sm mb-6">{inviteError}</p>
              <Button onClick={() => navigate('/login')} variant="outline" className="w-full">
                {t('auth.login')}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
                  <CheckCircle size={28} className="text-blue-600" />
                </div>
                <h1 className="text-xl font-bold text-gray-900">{t('users.invite_accept_title')}</h1>
                <p className="text-gray-500 text-sm mt-1">
                  {t('users.invite_accept_subtitle', { company: invite.company_name })}
                </p>
                <p className="text-xs text-gray-400 mt-1">{invite.email}</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                {formError && <Alert type="error" message={formError} />}

                <div className="grid grid-cols-2 gap-3">
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

                <Input
                  label={t('auth.password')}
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                />

                <Input
                  label={t('users.confirm_password')}
                  type="password"
                  value={password2}
                  onChange={(e) => setPassword2(e.target.value)}
                  placeholder={t('auth.password_placeholder')}
                  required
                />

                <Button type="submit" loading={submitting} className="w-full mt-2">
                  {t('users.complete_registration')}
                </Button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default InviteAcceptPage;
