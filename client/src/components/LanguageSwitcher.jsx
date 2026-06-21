import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Globe, ChevronDown } from 'lucide-react';
import clsx from 'clsx';

const LANGUAGES = [
  { code: 'it', label: 'Italiano', flag: '🇮🇹' },
  { code: 'en', label: 'English', flag: '🇬🇧' },
  { code: 'tr', label: 'Türkçe', flag: '🇹🇷' },
  { code: 'es', label: 'Español', flag: '🇪🇸' },
];

const LanguageSwitcher = ({ variant = 'default' }) => {
  const { i18n } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const currentLang = LANGUAGES.find((l) => l.code === i18n.language) || LANGUAGES[0];

  const handleChange = (code) => {
    i18n.changeLanguage(code);
    localStorage.setItem('fuel_manager_language', code);
    setOpen(false);
  };

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isDark = variant === 'dark';

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={clsx(
          'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
          isDark
            ? 'text-blue-200 hover:text-white hover:bg-white/10'
            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
        )}
      >
        <Globe size={15} />
        <span className="hidden sm:inline">{currentLang.flag} {currentLang.label}</span>
        <span className="sm:hidden">{currentLang.flag}</span>
        <ChevronDown size={13} className={clsx('transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-1 w-40 bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden z-50">
          {LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => handleChange(lang.code)}
              className={clsx(
                'flex items-center gap-3 w-full px-4 py-2.5 text-sm text-left transition-colors',
                lang.code === i18n.language
                  ? 'bg-blue-50 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-50'
              )}
            >
              <span>{lang.flag}</span>
              <span>{lang.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default LanguageSwitcher;
