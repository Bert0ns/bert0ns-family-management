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
    useState<ColorSchemePreference>('system');

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
