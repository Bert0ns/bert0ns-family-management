import React, { createContext, useContext, useState, useEffect } from 'react';
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

const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
  en,
  it,
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
      const navLang = window.navigator?.language || '';
      if (navLang.toLowerCase().startsWith('it')) {
        return 'it';
      }
    } catch {
      // Ignore navigator errors
    }
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

  const setLocale = (newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    AsyncStorage.setItem(STORAGE_KEY, newLocale).catch(() => {});
  };

  const t = DICTIONARIES[locale] || en;

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
};

export const useI18n = () => useContext(I18nContext);
