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
    brandLight: Palette.primary[50],
    brandDark: Palette.primary[900],
    background: Palette.neutral[50],
    surface: Palette.neutral[0],
    surfaceElevated: Palette.neutral[0],
    surfaceSubtle: Palette.neutral[100],
    border: Palette.neutral[200],
    borderSubtle: Palette.neutral[100],
    textPrimary: Palette.neutral[900],
    textSecondary: Palette.neutral[600],
    textMuted: Palette.neutral[400],
    textInverse: Palette.neutral[0],
    success: Palette.emerald[500],
    successBg: Palette.emerald[50],
    warning: Palette.amber[500],
    warningBg: Palette.amber[50],
    danger: Palette.rose[500],
    dangerBg: Palette.rose[50],
    info: Palette.sky[500],
    infoBg: Palette.sky[50],
    card: Palette.neutral[0],
    cardBorder: Palette.neutral[200],
    inputBg: Palette.neutral[0],
    inputBorder: Palette.neutral[300],
    shadow: 'rgba(15, 23, 42, 0.06)',
  },
};

export const DarkTheme = {
  isDark: true,
  colors: {
    brand: Palette.primary[500],
    brandLight: 'rgba(99, 102, 241, 0.15)',
    brandDark: Palette.primary[200],
    background: Palette.neutral[950],
    surface: Palette.neutral[900],
    surfaceElevated: Palette.neutral[800],
    surfaceSubtle: Palette.neutral[800],
    border: Palette.neutral[800],
    borderSubtle: Palette.neutral[800],
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
    card: Palette.neutral[900],
    cardBorder: Palette.neutral[800],
    inputBg: Palette.neutral[900],
    inputBorder: Palette.neutral[700],
    shadow: 'rgba(0, 0, 0, 0.3)',
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
