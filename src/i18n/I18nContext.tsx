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

const I18nContext = createContext<I18nContextType>({
  locale: 'en',
  setLocale: () => {},
  t: en,
});

const DICTIONARIES: Record<SupportedLocale, TranslationSchema> = {
  en,
  it,
};

export const I18nProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locale, setLocaleState] = useState<SupportedLocale>('en');

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
