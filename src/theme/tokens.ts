export const Palette = {
  primary: {
    50: '#EEF2FF',
    100: '#E0E7FF',
    200: '#C7D2FE',
    300: '#A5B4FC',
    400: '#818CF8',
    500: '#6366F1',
    600: '#4F46E5', // Brand Primary Indigo
    700: '#4338CA',
    800: '#3730A3',
    900: '#1E1B4B',
  },
  emerald: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    400: '#34D399',
    500: '#10B981', // Positive / On track
    600: '#059669',
  },
  amber: {
    50: '#FFFBEB',
    100: '#FEF3C7',
    400: '#FBBF24',
    500: '#F59E0B', // Warning / Near limit
    600: '#D97706',
  },
  rose: {
    50: '#FFF1F2',
    100: '#FFE4E6',
    400: '#FB7185',
    500: '#F43F5E', // Danger / Over budget
    600: '#E11D48',
  },
  sky: {
    50: '#F0F9FF',
    100: '#E0F2FE',
    400: '#38BDF8',
    500: '#0EA5E9',
    600: '#0284C7',
  },
  violet: {
    50: '#F5F3FF',
    100: '#EDE9FE',
    400: '#A78BFA',
    500: '#8B5CF6',
    600: '#7C3AED',
  },
  fuchsia: {
    50: '#FDF4FF',
    100: '#FAE8FF',
    400: '#E879F9',
    500: '#D946EF',
    600: '#C026D3',
  },
  neutral: {
    0: '#FFFFFF',
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
    950: '#020617',
  },
};

export const LightTheme = {
  isDark: false,
  colors: {
    brand: Palette.primary[600],
    brandLight: 'rgba(99, 102, 241, 0.08)',
    brandDark: Palette.primary[900],
    background: '#F6F8FC',
    surface: 'rgba(255, 255, 255, 0.82)',
    surfaceElevated: 'rgba(255, 255, 255, 0.92)',
    surfaceSubtle: 'rgba(241, 245, 249, 0.75)',
    border: 'rgba(226, 232, 240, 0.85)',
    borderSubtle: 'rgba(241, 245, 249, 0.65)',
    textPrimary: Palette.neutral[900],
    textSecondary: Palette.neutral[600],
    textMuted: Palette.neutral[400],
    textInverse: Palette.neutral[0],
    success: Palette.emerald[500],
    successBg: 'rgba(16, 185, 129, 0.1)',
    warning: Palette.amber[500],
    warningBg: 'rgba(245, 158, 11, 0.1)',
    danger: Palette.rose[500],
    dangerBg: 'rgba(244, 63, 94, 0.1)',
    info: Palette.sky[500],
    infoBg: 'rgba(14, 165, 233, 0.1)',
    card: 'rgba(255, 255, 255, 0.78)',
    cardBorder: 'rgba(255, 255, 255, 0.85)',
    inputBg: 'rgba(255, 255, 255, 0.75)',
    inputBorder: 'rgba(203, 213, 225, 0.65)',
    glass: 'rgba(255, 255, 255, 0.72)',
    glassElevated: 'rgba(255, 255, 255, 0.88)',
    glassSubtle: 'rgba(255, 255, 255, 0.5)',
    glassBorder: 'rgba(255, 255, 255, 0.85)',
    glassBorderSubtle: 'rgba(0, 0, 0, 0.05)',
    shadow: 'rgba(15, 23, 42, 0.08)',
  },
};

export const DarkTheme = {
  isDark: true,
  colors: {
    brand: Palette.primary[500],
    brandLight: 'rgba(99, 102, 241, 0.18)',
    brandDark: Palette.primary[200],
    background: '#090A10',
    surface: 'rgba(22, 23, 31, 0.8)',
    surfaceElevated: 'rgba(30, 32, 44, 0.9)',
    surfaceSubtle: 'rgba(28, 30, 40, 0.65)',
    border: 'rgba(255, 255, 255, 0.1)',
    borderSubtle: 'rgba(255, 255, 255, 0.05)',
    textPrimary: Palette.neutral[50],
    textSecondary: Palette.neutral[300],
    textMuted: Palette.neutral[500],
    textInverse: Palette.neutral[900],
    success: Palette.emerald[400],
    successBg: 'rgba(16, 185, 129, 0.15)',
    warning: Palette.amber[400],
    warningBg: 'rgba(245, 158, 11, 0.15)',
    danger: Palette.rose[400],
    dangerBg: 'rgba(244, 63, 94, 0.15)',
    info: Palette.sky[400],
    infoBg: 'rgba(14, 165, 233, 0.15)',
    card: 'rgba(24, 25, 34, 0.75)',
    cardBorder: 'rgba(255, 255, 255, 0.12)',
    inputBg: 'rgba(18, 19, 26, 0.75)',
    inputBorder: 'rgba(255, 255, 255, 0.14)',
    glass: 'rgba(24, 25, 34, 0.75)',
    glassElevated: 'rgba(34, 36, 48, 0.88)',
    glassSubtle: 'rgba(24, 25, 34, 0.5)',
    glassBorder: 'rgba(255, 255, 255, 0.15)',
    glassBorderSubtle: 'rgba(255, 255, 255, 0.07)',
    shadow: 'rgba(0, 0, 0, 0.45)',
  },
};

export type Theme = typeof LightTheme;

export const Spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 48,
};

export const Radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  full: 9999,
};

export const TouchTargets = {
  sm: 48,
  md: 56,
  lg: 64,
  xl: 72,
};

export const Typography = {
  fontSizes: {
    xs: 11,
    sm: 13,
    md: 15,
    lg: 17,
    xl: 20,
    xxl: 24,
    xxxl: 30,
    display: 36,
    giant: 40,
    hero: 48,
  },
  fontWeights: {
    regular: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    heavy: '800' as const,
  },
};

export const MemberColors = [
  { name: 'Indigo', bg: Palette.primary[600], light: Palette.primary[100] },
  { name: 'Emerald', bg: Palette.emerald[500], light: Palette.emerald[100] },
  { name: 'Amber', bg: Palette.amber[500], light: Palette.amber[100] },
  { name: 'Rose', bg: Palette.rose[500], light: Palette.rose[100] },
  { name: 'Sky', bg: Palette.sky[500], light: Palette.sky[100] },
  { name: 'Violet', bg: Palette.violet[500], light: Palette.violet[100] },
  { name: 'Fuchsia', bg: Palette.fuchsia[500], light: Palette.fuchsia[100] },
];
