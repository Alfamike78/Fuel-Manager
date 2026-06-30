import { useState, useCallback } from "react";
import { translations, Lang, TranslationKey } from "../i18n/translations";

const STORAGE_KEY = "pc_lang";

function getInitialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && stored in translations) return stored as Lang;
    const browser = navigator.language.slice(0, 2).toLowerCase();
    if (browser in translations) return browser as Lang;
  } catch {}
  return "it";
}

let globalLang: Lang = "it";
let listeners: Array<(l: Lang) => void> = [];

export function setGlobalLang(l: Lang) {
  globalLang = l;
  try { localStorage.setItem(STORAGE_KEY, l); } catch {}
  listeners.forEach((fn) => fn(l));
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(() => {
    globalLang = getInitialLang();
    return globalLang;
  });

  const changeLang = useCallback((l: Lang) => {
    setGlobalLang(l);
    setLang(l);
  }, []);

  // Subscribe to global changes
  useState(() => {
    const fn = (l: Lang) => setLang(l);
    listeners.push(fn);
    return () => { listeners = listeners.filter((x) => x !== fn); };
  });

  const t = useCallback((key: TranslationKey): string => {
    return (translations[lang] as any)[key] ?? (translations["it"] as any)[key] ?? key;
  }, [lang]);

  return { lang, changeLang, t };
}
