import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fuel, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Alert from '../../components/ui/Alert.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const LoginPage = () => {
  const { t } = useTranslation();
  const { login } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) return;

    setLoading(true);
    setError('');

    try {
      const user = await login(form.email, form.password);

      // Redirect based on role
      if (user.role === 'superadmin') {
        navigate('/superadmin');
      } else {
        navigate('/dashboard');
      }
    } catch (err) {
      const message = err.response?.data?.error || t('auth.login_error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e3a8a 100%)' }}>
      {/* Left panel - branding */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-1/2">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Fuel size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Fuel Manager</p>
            <p className="text-blue-300 text-sm">PilotCraft Solutions</p>
          </div>
        </div>

        <h1 className="text-4xl font-bold text-white mb-4 leading-tight">
          {t('landing.hero.title')}
        </h1>
        <p className="text-blue-200 text-lg leading-relaxed max-w-md">
          {t('landing.hero.subtitle')}
        </p>

        {/* Feature bullets */}
        <div className="mt-12 space-y-4">
          {[
            'Tracciamento rifornimenti in tempo reale',
            'Dashboard multi-base e multi-cisterna',
            'Report di conformità automatici',
            'Accessibile da qualsiasi dispositivo',
          ].map((item) => (
            <div key={item} className="flex items-center gap-3 text-blue-200">
              <div className="w-5 h-5 bg-blue-500/30 rounded-full flex items-center justify-center flex-shrink-0">
                <div className="w-2 h-2 bg-blue-400 rounded-full" />
              </div>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex lg:hidden items-center gap-3 mb-8 justify-center">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
              <Fuel size={18} className="text-white" />
            </div>
            <p className="text-white font-bold">Fuel Manager</p>
          </div>

          <div className="bg-white rounded-2xl shadow-2xl p-8">
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.login_title')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('auth.login_subtitle')}</p>
              </div>
              <LanguageSwitcher />
            </div>

            {error && (
              <Alert variant="error" className="mb-5" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <Input
                label={t('auth.email')}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('auth.email_placeholder')}
                required
                autoComplete="email"
                autoFocus
              />

              <div className="relative">
                <Input
                  label={t('auth.password')}
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder={t('auth.password_placeholder')}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-[38px] p-1 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              <div className="flex justify-end">
                <button type="button" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                  {t('auth.forgot_password')}
                </button>
              </div>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="w-full"
              >
                {t('auth.login')}
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-gray-500">
              {t('auth.no_account')}{' '}
              <Link to="/register" className="text-blue-600 hover:text-blue-700 font-semibold">
                {t('nav.register')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
