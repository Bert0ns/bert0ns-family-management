import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, initialWindowMetrics } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { I18nProvider, useI18n } from '@/i18n';

export { ErrorBoundary } from 'expo-router';

// Default initial metrics fallback (especially for Web/SSR) to guarantee safe area insets are always available immediately
const defaultInitialMetrics = initialWindowMetrics ?? {
  frame: { x: 0, y: 0, width: 0, height: 0 },
  insets: { top: 0, left: 0, right: 0, bottom: 0 },
};

function RootLayoutNav() {
  const { theme, isDark } = useTheme();
  const { t } = useI18n();

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: theme.colors.surface,
          },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: {
            backgroundColor: theme.colors.background,
          },
        }}
      >
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="expense/add"
          options={{
            presentation: 'modal',
            title: t.addExpense.title,
            headerShown: true,
          }}
        />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider initialMetrics={defaultInitialMetrics}>
      <I18nProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
