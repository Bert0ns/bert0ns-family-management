import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TranslationSchema } from './types';
import { en } from './en';
import { it } from './it';

export type SupportedLocale = 'en' | 'it';

interface I18nContextType {
  locale: SupportedLocale;
  setLocale: (loc: SupportedLocale) => void;
  t: TranslationSchema;
}

const STORAGE_KEY = '@bert0ns_family_app_locale';

export function deepMergeDictionaries<T extends Record<string, any>>(
  base: T,
  override: Partial<T> | Record<string, any>,
): T {
  const result = { ...base } as any;
  for (const key of Object.keys(override)) {
    const overrideVal = override[key];
    const baseVal = base[key];
    if (
      overrideVal !== undefined &&
      overrideVal !== null &&
      typeof overrideVal === 'object' &&
      !Array.isArray(overrideVal) &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeDictionaries(baseVal, overrideVal);
    } else if (overrideVal !== undefined && overrideVal !== '') {
      result[key] = overrideVal;
    }
  }
  return result;
}

export const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
  en,
  it: deepMergeDictionaries(en, it),
};

export function getInitialLocale(): SupportedLocale {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'en' || saved === 'it') {
        return saved;
      }
    } catch {
      // Ignore localStorage read errors
    }
    try {
      const navLang = window.navigator?.language;
      if (typeof navLang === 'string' && navLang.length > 0) {
        return navLang.toLowerCase().startsWith('it') ? 'it' : 'en';
      }
    } catch {
      // Ignore navigator errors
    }
  }
  try {
    const deviceLocale = Intl.DateTimeFormat().resolvedOptions().locale;
    if (deviceLocale && deviceLocale.toLowerCase().startsWith('it')) {
      return 'it';
    }
  } catch {
    // Ignore Intl errors
  }
  return 'en';
}

const initialLocale = getInitialLocale();

const I18nContext = createContext<I18nContextType>({
  locale: initialLocale,
  setLocale: () => {},
  t: DICTIONARIES[initialLocale] || en,
});

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>(getInitialLocale);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'en' || saved === 'it') {
        setLocaleState(saved);
      }
    });
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, newLocale);
      } catch {
        // Ignore localStorage write errors
      }
    }
    AsyncStorage.setItem(STORAGE_KEY, newLocale).catch(() => {});
  }, []);

  const t = DICTIONARIES[locale] || en;

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
