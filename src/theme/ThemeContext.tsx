import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LightTheme,
  DarkTheme,
  SeniorLightTheme,
  SeniorDarkTheme,
  Theme,
  Spacing,
  Radius,
  TouchTargets,
  SeniorTouchTargets,
  Typography,
  SeniorTypography,
  Palette,
  MemberColors,
} from './tokens';

export type ColorSchemePreference = 'light' | 'dark' | 'system';
export type ReadabilityMode = 'standard' | 'senior';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorSchemePreference: ColorSchemePreference;
  setColorSchemePreference: (pref: ColorSchemePreference) => void;
  readabilityMode: ReadabilityMode;
  isSeniorMode: boolean;
  setReadabilityMode: (mode: ReadabilityMode) => void;
  spacing: typeof Spacing;
  radius: typeof Radius;
  touchTargets: typeof TouchTargets;
  typography: typeof Typography;
  palette: typeof Palette;
  memberColors: typeof MemberColors;
}

const STORAGE_KEY = '@bert0ns_family_app_theme';
const READABILITY_STORAGE_KEY = '@bert0ns_family_app_readability';

export function getInitialThemePreference(): ColorSchemePreference {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        return saved as ColorSchemePreference;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }
  return 'system';
}

export function getInitialReadabilityMode(): ReadabilityMode {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(READABILITY_STORAGE_KEY);
      if (saved === 'standard' || saved === 'senior') {
        return saved as ReadabilityMode;
      }
    } catch {
      // Ignore localStorage read errors
    }
  }
  return 'standard';
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LightTheme,
  isDark: false,
  colorSchemePreference: 'system',
  setColorSchemePreference: () => {},
  readabilityMode: 'standard',
  isSeniorMode: false,
  setReadabilityMode: () => {},
  spacing: Spacing,
  radius: Radius,
  touchTargets: TouchTargets,
  typography: Typography,
  palette: Palette,
  memberColors: MemberColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorSchemePreference, setColorSchemePreferenceState] =
    useState<ColorSchemePreference>(getInitialThemePreference);
  const [readabilityMode, setReadabilityModeState] =
    useState<ReadabilityMode>(getInitialReadabilityMode);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setColorSchemePreferenceState(saved);
      }
    });
    AsyncStorage.getItem(READABILITY_STORAGE_KEY).then((saved) => {
      if (saved === 'standard' || saved === 'senior') {
        setReadabilityModeState(saved as ReadabilityMode);
      }
    });
  }, []);

  const setColorSchemePreference = useCallback((pref: ColorSchemePreference) => {
    setColorSchemePreferenceState(pref);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(STORAGE_KEY, pref);
      } catch {
        // Ignore localStorage write errors
      }
    }
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  }, []);

  const setReadabilityMode = useCallback((mode: ReadabilityMode) => {
    setReadabilityModeState(mode);
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(READABILITY_STORAGE_KEY, mode);
      } catch {
        // Ignore localStorage write errors
      }
    }
    AsyncStorage.setItem(READABILITY_STORAGE_KEY, mode).catch(() => {});
  }, []);

  const activeScheme =
    colorSchemePreference === 'system' ? systemColorScheme || 'light' : colorSchemePreference;
  const isDark = activeScheme === 'dark';
  const isSeniorMode = readabilityMode === 'senior';

  const theme = isSeniorMode
    ? isDark
      ? SeniorDarkTheme
      : SeniorLightTheme
    : isDark
      ? DarkTheme
      : LightTheme;
  const typography = isSeniorMode ? SeniorTypography : Typography;
  const touchTargets = isSeniorMode ? SeniorTouchTargets : TouchTargets;

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.style.backgroundColor = theme.colors.background;
      document.body.style.backgroundColor = theme.colors.background;
      const root = document.getElementById('root');
      if (root) {
        root.style.backgroundColor = theme.colors.background;
      }
    }
  }, [theme.colors.background]);

  const value = useMemo(
    () => ({
      theme,
      isDark,
      colorSchemePreference,
      setColorSchemePreference,
      readabilityMode,
      isSeniorMode,
      setReadabilityMode,
      spacing: Spacing,
      radius: Radius,
      touchTargets,
      typography,
      palette: Palette,
      memberColors: MemberColors,
    }),
    [
      theme,
      isDark,
      colorSchemePreference,
      setColorSchemePreference,
      readabilityMode,
      isSeniorMode,
      setReadabilityMode,
      touchTargets,
      typography,
    ],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = () => useContext(ThemeContext);
