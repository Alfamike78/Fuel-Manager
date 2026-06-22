import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Fuel, Eye, EyeOff, Building2, User, Mail, Lock, Check } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth.js';
import Button from '../../components/ui/Button.jsx';
import Input from '../../components/ui/Input.jsx';
import Alert from '../../components/ui/Alert.jsx';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const RegisterPage = () => {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({
    company_name: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { company_name, first_name, last_name, email, password } = form;
    if (!company_name || !first_name || !last_name || !email || !password) return;

    if (password.length < 8) {
      setError(t('auth.password_min'));
      return;
    }

    setLoading(true);
    setError('');

    try {
      await register(form);
      navigate('/dashboard');
    } catch (err) {
      const message = err.response?.data?.error || t('auth.register_error');
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = () => {
    const pw = form.password;
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    return score;
  };

  const strengthScore = passwordStrength();
  const strengthColors = ['', 'bg-red-400', 'bg-yellow-400', 'bg-blue-400', 'bg-green-500'];
  const strengthLabels = ['', 'Debole', 'Discreta', 'Buona', 'Ottima'];

  const trialBenefits = [
    '14 giorni gratis, nessuna carta di credito',
    'Fino a 2 cisterne e 5 veicoli',
    '2 utenti inclusi',
    'Supporto email',
  ];

  return (
    <div className="min-h-screen flex" style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #1e3a8a 100%)' }}>
      {/* Left panel - benefits */}
      <div className="hidden lg:flex flex-col justify-center px-16 w-5/12">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-blue-500 rounded-xl flex items-center justify-center">
            <Fuel size={22} className="text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-lg">Fuel Manager</p>
            <p className="text-blue-300 text-sm">PilotCraft Solutions</p>
          </div>
        </div>

        <h2 className="text-3xl font-bold text-white mb-3">
          {t('auth.register_title')}
        </h2>
        <p className="text-blue-200 mb-10">{t('auth.register_subtitle')}</p>

        <div className="bg-white/10 border border-white/20 rounded-2xl p-6 space-y-4">
          <h3 className="text-white font-semibold text-sm uppercase tracking-wider">Piano Trial include:</h3>
          {trialBenefits.map((benefit) => (
            <div key={benefit} className="flex items-center gap-3">
              <div className="w-6 h-6 bg-green-500/20 border border-green-400/30 rounded-full flex items-center justify-center flex-shrink-0">
                <Check size={12} className="text-green-400" />
              </div>
              <span className="text-blue-100 text-sm">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel - form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
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
                <h2 className="text-2xl font-bold text-gray-900">{t('auth.register_title')}</h2>
                <p className="text-gray-500 text-sm mt-1">{t('auth.register_subtitle')}</p>
              </div>
              <LanguageSwitcher />
            </div>

            {error && (
              <Alert variant="error" className="mb-5" onClose={() => setError('')}>
                {error}
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Company name */}
              <Input
                label={t('auth.company_name')}
                type="text"
                name="company_name"
                value={form.company_name}
                onChange={handleChange}
                placeholder="Aero Club Milano"
                required
                autoFocus
              />

              {/* Name row */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label={t('auth.first_name')}
                  type="text"
                  name="first_name"
                  value={form.first_name}
                  onChange={handleChange}
                  placeholder="Marco"
                  required
                />
                <Input
                  label={t('auth.last_name')}
                  type="text"
                  name="last_name"
                  value={form.last_name}
                  onChange={handleChange}
                  placeholder="Rossi"
                  required
                />
              </div>

              {/* Email */}
              <Input
                label={t('auth.email')}
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder={t('auth.email_placeholder')}
                required
                autoComplete="email"
              />

              {/* Password */}
              <div>
                <div className="relative">
                  <Input
                    label={t('auth.password')}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={t('auth.password_placeholder')}
                    required
                    autoComplete="new-password"
                    hint={t('auth.password_min')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-[38px] p-1 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {form.password && (
                  <div className="mt-2">
                    <div className="flex gap-1 mb-1">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className={`h-1 flex-1 rounded-full transition-colors ${
                            i <= strengthScore ? strengthColors[strengthScore] : 'bg-gray-200'
                          }`}
                        />
                      ))}
                    </div>
                    {strengthScore > 0 && (
                      <p className={`text-xs ${strengthScore >= 3 ? 'text-green-600' : 'text-gray-500'}`}>
                        Sicurezza: {strengthLabels[strengthScore]}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                loading={loading}
                className="w-full mt-2"
              >
                {t('auth.register')}
              </Button>
            </form>

            <p className="mt-5 text-center text-xs text-gray-400">
              Registrandoti accetti i nostri{' '}
              <a href="#" className="text-blue-600 hover:underline">Termini di servizio</a>{' '}
              e la nostra{' '}
              <a href="#" className="text-blue-600 hover:underline">Privacy Policy</a>.
            </p>

            <p className="mt-4 text-center text-sm text-gray-500">
              {t('auth.have_account')}{' '}
              <Link to="/login" className="text-blue-600 hover:text-blue-700 font-semibold">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
