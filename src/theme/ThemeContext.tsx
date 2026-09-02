import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import {
  LightTheme,
  DarkTheme,
  Theme,
  Spacing,
  Radius,
  Typography,
  Palette,
  MemberColors,
} from './tokens';

type ColorSchemePreference = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  colorSchemePreference: ColorSchemePreference;
  setColorSchemePreference: (pref: ColorSchemePreference) => void;
  spacing: typeof Spacing;
  radius: typeof Radius;
  typography: typeof Typography;
  palette: typeof Palette;
  memberColors: typeof MemberColors;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LightTheme,
  isDark: false,
  colorSchemePreference: 'system',
  setColorSchemePreference: () => {},
  spacing: Spacing,
  radius: Radius,
  typography: Typography,
  palette: Palette,
  memberColors: MemberColors,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const systemColorScheme = useColorScheme();
  const [colorSchemePreference, setColorSchemePreference] =
    useState<ColorSchemePreference>('system');

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
