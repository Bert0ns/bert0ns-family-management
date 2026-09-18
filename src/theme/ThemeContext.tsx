import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LightTheme,
  DarkTheme,
  Theme,
  Spacing,
  Radius,
  TouchTargets,
  Typography,
  Palette,
  MemberColors,
} from './tokens';

export type ColorSchemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorSchemePreference: ColorSchemePreference;
  setColorSchemePreference: (pref: ColorSchemePreference) => void;
  spacing: typeof Spacing;
  radius: typeof Radius;
  touchTargets: typeof TouchTargets;
  typography: typeof Typography;
  palette: typeof Palette;
  memberColors: typeof MemberColors;
}

const STORAGE_KEY = '@bert0ns_family_app_theme';

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

const ThemeContext = createContext<ThemeContextType>({
  theme: LightTheme,
  isDark: false,
  colorSchemePreference: 'system',
  setColorSchemePreference: () => {},
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

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((saved) => {
      if (saved === 'light' || saved === 'dark' || saved === 'system') {
        setColorSchemePreferenceState(saved);
      }
    });
  }, []);

  const setColorSchemePreference = (pref: ColorSchemePreference) => {
    setColorSchemePreferenceState(pref);
    AsyncStorage.setItem(STORAGE_KEY, pref).catch(() => {});
  };

  const activeScheme =
    colorSchemePreference === 'system' ? systemColorScheme || 'light' : colorSchemePreference;
  const isDark = activeScheme === 'dark';
  const theme = isDark ? DarkTheme : LightTheme;

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

  return (
    <ThemeContext.Provider
      value={{
        theme,
        isDark,
        colorSchemePreference,
        setColorSchemePreference,
        spacing: Spacing,
        radius: Radius,
        touchTargets: TouchTargets,
        typography: Typography,
        palette: Palette,
        memberColors: MemberColors,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
