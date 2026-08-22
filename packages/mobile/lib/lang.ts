import { useState, useCallback, useEffect } from "react";
import * as SecureStore from "expo-secure-store";
import { translations, Lang, TranslationKey, LANGS } from "../i18n/translations";

const STORAGE_KEY = "pc_lang";

function readStored(): Lang | null {
  try {
    const v = SecureStore.getItem(STORAGE_KEY);
    if (v && v in translations) return v as Lang;
  } catch {
    try {
      const v = localStorage.getItem(STORAGE_KEY);
      if (v && v in translations) return v as Lang;
    } catch {}
  }
  return null;
}

function writeStored(l: Lang) {
  try {
    SecureStore.setItem(STORAGE_KEY, l);
  } catch {
    try {
      localStorage.setItem(STORAGE_KEY, l);
    } catch {}
  }
}

function detectDeviceLang(): Lang {
  try {
    const nav = (globalThis as any).navigator;
    const code = String(nav?.language ?? "it").slice(0, 2).toLowerCase();
    if (code in translations) return code as Lang;
  } catch {}
  return "it";
}

// ── Store globale semplice: tutti gli schermi restano in sync ───────────────
let globalLang: Lang = readStored() ?? detectDeviceLang();
let listeners: Array<(l: Lang) => void> = [];

export function getLang(): Lang {
  return globalLang;
}

export function setGlobalLang(l: Lang) {
  globalLang = l;
  writeStored(l);
  listeners.forEach((fn) => fn(l));
}

/** Traduzione fuori dai componenti React */
export function tr(key: TranslationKey): string {
  const dict = translations[globalLang] as Record<string, string>;
  const fallback = translations.it as Record<string, string>;
  return dict?.[key] ?? fallback[key] ?? String(key);
}

export function useLang() {
  const [lang, setLang] = useState<Lang>(globalLang);

  useEffect(() => {
    const fn = (l: Lang) => setLang(l);
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((x) => x !== fn);
    };
  }, []);

  const changeLang = useCallback((l: Lang) => setGlobalLang(l), []);

  const t = useCallback(
    (key: TranslationKey): string => {
      const dict = translations[lang] as Record<string, string>;
      const fallback = translations.it as Record<string, string>;
      return dict?.[key] ?? fallback[key] ?? String(key);
    },
    [lang],
  );

  return { lang, changeLang, t, langs: LANGS };
}

export { LANGS };
export type { Lang, TranslationKey };
