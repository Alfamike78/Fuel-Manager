import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Fuel, Gauge, MapPin, BarChart3, Shield, Globe,
  Check, ChevronRight, Menu, X, Plane
} from 'lucide-react';
import LanguageSwitcher from '../../components/LanguageSwitcher.jsx';

const BRAND_DARK = '#1e3a5f';
const BRAND_MID = '#2563eb';
const BRAND_LIGHT = '#f0f9ff';

const LandingPage = () => {
  const { t } = useTranslation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [pricingYearly, setPricingYearly] = useState(false);

  const features = [
    {
      icon: Fuel,
      key: 'fuel',
      color: 'bg-blue-100 text-blue-600',
    },
    {
      icon: Gauge,
      key: 'tanks',
      color: 'bg-sky-100 text-sky-600',
    },
    {
      icon: MapPin,
      key: 'locations',
      color: 'bg-indigo-100 text-indigo-600',
    },
    {
      icon: BarChart3,
      key: 'reports',
      color: 'bg-violet-100 text-violet-600',
    },
    {
      icon: Shield,
      key: 'security',
      color: 'bg-cyan-100 text-cyan-600',
    },
    {
      icon: Globe,
      key: 'globe',
      color: 'bg-teal-100 text-teal-600',
    },
  ];

  const plans = [
    {
      key: 'trial',
      price_monthly: 0,
      price_yearly: 0,
      max_tanks: 2,
      max_vehicles: 5,
      max_users: 2,
      features: ['pdf_export', 'support_email'],
      negFeatures: ['excel_export', 'import', 'support_priority'],
      cta: 'cta_trial',
      highlighted: false,
    },
    {
      key: 'basic',
      price_monthly: 49,
      price_yearly: 490,
      max_tanks: 5,
      max_vehicles: 20,
      max_users: 5,
      features: ['pdf_export', 'support_email'],
      negFeatures: ['excel_export', 'import', 'support_priority'],
      cta: 'cta_start',
      highlighted: false,
    },
    {
      key: 'pro',
      price_monthly: 149,
      price_yearly: 1490,
      max_tanks: null,
      max_vehicles: null,
      max_users: 20,
      features: ['pdf_export', 'excel_export', 'support_priority'],
      negFeatures: ['import'],
      cta: 'cta_start',
      highlighted: true,
    },
    {
      key: 'enterprise',
      price_monthly: 399,
      price_yearly: 3990,
      max_tanks: null,
      max_vehicles: null,
      max_users: null,
      features: ['pdf_export', 'excel_export', 'import', 'support_dedicated'],
      negFeatures: [],
      cta: 'cta_contact',
      highlighted: false,
    },
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* ==================== NAVBAR ==================== */}
      <nav
        className="sticky top-0 z-40 border-b border-white/10 backdrop-blur-md"
        style={{ backgroundColor: `${BRAND_DARK}f0` }}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center gap-3">
              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                <Fuel size={18} className="text-white" />
              </div>
              <div className="leading-tight">
                <span className="text-white font-bold text-sm">Fuel Manager</span>
                <span className="hidden sm:block text-blue-300 text-xs">PilotCraft Solutions</span>
              </div>
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex items-center gap-1">
              <a href="#features" className="px-4 py-2 text-blue-200 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/10">
                {t('nav.features')}
              </a>
              <a href="#pricing" className="px-4 py-2 text-blue-200 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/10">
                {t('nav.pricing')}
              </a>
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageSwitcher variant="dark" />
              <div className="hidden sm:flex items-center gap-2">
                <Link
                  to="/login"
                  className="px-4 py-2 text-blue-200 hover:text-white text-sm font-medium transition-colors rounded-lg hover:bg-white/10"
                >
                  {t('nav.login')}
                </Link>
                <Link
                  to="/register"
                  className="px-4 py-2 bg-blue-500 hover:bg-blue-400 text-white text-sm font-semibold rounded-lg transition-colors"
                >
                  {t('nav.register')}
                </Link>
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-blue-200 hover:text-white rounded-lg hover:bg-white/10"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-white/10 px-4 py-3 space-y-2">
            <a href="#features" className="block px-3 py-2 text-blue-200 hover:text-white text-sm rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.features')}
            </a>
            <a href="#pricing" className="block px-3 py-2 text-blue-200 hover:text-white text-sm rounded-lg hover:bg-white/10" onClick={() => setMobileMenuOpen(false)}>
              {t('nav.pricing')}
            </a>
            <div className="flex gap-2 pt-2">
              <Link to="/login" className="flex-1 text-center px-4 py-2 text-blue-200 border border-blue-400/30 text-sm rounded-lg hover:bg-white/10">
                {t('nav.login')}
              </Link>
              <Link to="/register" className="flex-1 text-center px-4 py-2 bg-blue-500 text-white text-sm font-semibold rounded-lg">
                {t('nav.register')}
              </Link>
            </div>
          </div>
        )}
      </nav>

      {/* ==================== HERO ==================== */}
      <section
        className="relative overflow-hidden pt-20 pb-32"
        style={{ background: `linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a8a 50%, #1d4ed8 100%)` }}
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl" />
          <Plane className="absolute top-20 right-20 text-white/5 rotate-12" size={200} />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/20 border border-blue-400/30 rounded-full text-blue-200 text-sm font-medium mb-8">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
            Trusted by aviation operators across Europe
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white leading-tight text-balance mb-6">
            {t('landing.hero.title')}
          </h1>

          <p className="text-lg sm:text-xl text-blue-200 max-w-3xl mx-auto mb-10 text-balance leading-relaxed">
            {t('landing.hero.subtitle')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-8 py-4 bg-blue-500 hover:bg-blue-400 text-white font-semibold rounded-xl transition-colors text-lg shadow-lg shadow-blue-900/30"
            >
              {t('landing.hero.cta')}
              <ChevronRight size={18} />
            </Link>
            <button className="inline-flex items-center gap-2 px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl transition-colors text-lg border border-white/20">
              {t('landing.hero.cta_demo')}
            </button>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-8 mt-16 max-w-2xl mx-auto">
            {[
              { value: '500+', label: 'Operatori attivi' },
              { value: '2M+', label: 'Litri tracciati' },
              { value: '99.9%', label: 'Uptime SLA' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <div className="text-3xl font-bold text-white">{stat.value}</div>
                <div className="text-blue-300 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== FEATURES ==================== */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.features.title')}
            </h2>
            <p className="text-lg text-gray-500 max-w-2xl mx-auto">
              {t('landing.features.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map(({ icon: Icon, key, color }) => (
              <div
                key={key}
                className="group p-8 rounded-2xl border border-gray-100 hover:border-blue-100 hover:shadow-lg hover:shadow-blue-50 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${color}`}>
                  <Icon size={22} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {t(`landing.features.items.${key}.title`)}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {t(`landing.features.items.${key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== HOW IT WORKS ==================== */}
      <section className="py-24" style={{ backgroundColor: BRAND_LIGHT }}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.how_it_works.title')}
            </h2>
            <p className="text-lg text-gray-500">
              {t('landing.how_it_works.subtitle')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[1, 2, 3].map((step) => (
              <div key={step} className="relative flex flex-col items-center text-center">
                {/* Connector line */}
                {step < 3 && (
                  <div className="hidden md:block absolute top-10 left-1/2 w-full h-0.5 bg-blue-200" style={{ left: '50%' }} />
                )}

                {/* Step circle */}
                <div
                  className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold text-white mb-6 shadow-lg"
                  style={{ background: `linear-gradient(135deg, ${BRAND_MID}, ${BRAND_DARK})` }}
                >
                  {step}
                </div>

                <h3 className="text-xl font-semibold text-gray-900 mb-3">
                  {t(`landing.how_it_works.steps.${step}.title`)}
                </h3>
                <p className="text-gray-500 leading-relaxed">
                  {t(`landing.how_it_works.steps.${step}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ==================== PRICING ==================== */}
      <section id="pricing" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4">
              {t('landing.pricing.title')}
            </h2>
            <p className="text-lg text-gray-500 mb-8">
              {t('landing.pricing.subtitle')}
            </p>

            {/* Monthly / Yearly toggle */}
            <div className="inline-flex items-center gap-3 bg-gray-100 rounded-xl p-1">
              <button
                onClick={() => setPricingYearly(false)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                  !pricingYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('landing.pricing.monthly')}
              </button>
              <button
                onClick={() => setPricingYearly(true)}
                className={`px-5 py-2.5 rounded-lg text-sm font-semibold transition-colors flex items-center gap-2 ${
                  pricingYearly ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('landing.pricing.yearly')}
                <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
                  {t('landing.pricing.yearly_save')}
                </span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const price = pricingYearly ? plan.price_yearly : plan.price_monthly;
              const period = pricingYearly
                ? t('landing.pricing.per_year')
                : t('landing.pricing.per_month');

              return (
                <div
                  key={plan.key}
                  className={`relative rounded-2xl p-8 flex flex-col ${
                    plan.highlighted
                      ? 'border-2 border-blue-600 shadow-xl shadow-blue-100'
                      : 'border border-gray-200'
                  }`}
                  style={plan.highlighted ? { background: `linear-gradient(180deg, ${BRAND_LIGHT} 0%, white 100%)` } : {}}
                >
                  {plan.highlighted && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                      <span className="bg-blue-600 text-white text-xs font-bold px-4 py-1.5 rounded-full">
                        {t('landing.pricing.recommended')}
                      </span>
                    </div>
                  )}

                  <div className="mb-6">
                    <h3 className="text-xl font-bold text-gray-900 mb-1">{t(`plans.${plan.key}`)}</h3>
                    <p className="text-sm text-gray-500">{t(`plans.${plan.key}_desc`)}</p>
                  </div>

                  <div className="mb-6">
                    <div className="flex items-baseline gap-1">
                      <span className="text-4xl font-bold text-gray-900">
                        {price === 0 ? t('landing.pricing.free') : `€${price}`}
                      </span>
                      {price > 0 && (
                        <span className="text-gray-500 text-sm">{period}</span>
                      )}
                    </div>
                  </div>

                  {/* Plan limits */}
                  <div className="space-y-2 mb-6 pb-6 border-b border-gray-100">
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-blue-600 flex-shrink-0" />
                      <span>
                        {plan.max_tanks === null
                          ? t('landing.pricing.features.unlimited')
                          : plan.max_tanks}{' '}
                        {t('landing.pricing.features.tanks')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-blue-600 flex-shrink-0" />
                      <span>
                        {plan.max_vehicles === null
                          ? t('landing.pricing.features.unlimited')
                          : plan.max_vehicles}{' '}
                        {t('landing.pricing.features.vehicles')}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Check size={14} className="text-blue-600 flex-shrink-0" />
                      <span>
                        {plan.max_users === null
                          ? t('landing.pricing.features.unlimited')
                          : plan.max_users}{' '}
                        {t('landing.pricing.features.users')}
                      </span>
                    </div>
                  </div>

                  {/* Included features */}
                  <div className="space-y-2 flex-1 mb-8">
                    {plan.features.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-sm text-gray-700">
                        <Check size={14} className="text-green-500 flex-shrink-0" />
                        {t(`landing.pricing.features.${feat}`)}
                      </div>
                    ))}
                    {plan.negFeatures.map((feat) => (
                      <div key={feat} className="flex items-center gap-2 text-sm text-gray-400">
                        <div className="w-3.5 h-3.5 flex-shrink-0 flex items-center justify-center">
                          <div className="w-2 h-0.5 bg-gray-300 rounded" />
                        </div>
                        {t(`landing.pricing.features.${feat}`)}
                      </div>
                    ))}
                  </div>

                  <Link
                    to={plan.key === 'enterprise' ? '#contact' : '/register'}
                    className={`w-full text-center py-3 px-6 rounded-xl font-semibold text-sm transition-colors ${
                      plan.highlighted
                        ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-200'
                        : 'bg-gray-900 hover:bg-gray-700 text-white'
                    }`}
                  >
                    {t(`landing.pricing.${plan.cta}`)}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ==================== CTA SECTION ==================== */}
      <section
        className="py-24"
        style={{ background: `linear-gradient(135deg, ${BRAND_DARK} 0%, #1e3a8a 100%)` }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            {t('landing.cta_section.title')}
          </h2>
          <p className="text-blue-200 text-lg mb-10">
            {t('landing.cta_section.subtitle')}
          </p>
          <Link
            to="/register"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-blue-700 font-semibold rounded-xl hover:bg-blue-50 transition-colors text-lg shadow-xl"
          >
            {t('landing.cta_section.button')}
            <ChevronRight size={18} />
          </Link>
        </div>
      </section>

      {/* ==================== FOOTER ==================== */}
      <footer className="bg-gray-900 text-gray-400 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                  <Fuel size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-white font-bold">Fuel Manager</p>
                  <p className="text-gray-500 text-xs">PilotCraft Solutions</p>
                </div>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed max-w-sm">
                {t('landing.footer.tagline')}
              </p>
            </div>

            {/* Product */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {t('landing.footer.product')}
              </h4>
              <ul className="space-y-2">
                <li><a href="#features" className="text-sm hover:text-white transition-colors">{t('landing.footer.features')}</a></li>
                <li><a href="#pricing" className="text-sm hover:text-white transition-colors">{t('landing.footer.pricing')}</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="text-white font-semibold mb-4 text-sm uppercase tracking-wider">
                {t('landing.footer.legal')}
              </h4>
              <ul className="space-y-2">
                <li><a href="#" className="text-sm hover:text-white transition-colors">{t('landing.footer.privacy')}</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">{t('landing.footer.terms')}</a></li>
                <li><a href="#" className="text-sm hover:text-white transition-colors">{t('landing.footer.contact')}</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} PilotCraft Solutions. {t('landing.footer.rights')}
            </p>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
              <span className="text-sm text-green-400">All systems operational</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
