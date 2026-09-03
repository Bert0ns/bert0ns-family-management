import React from 'react';
import { Stack } from 'expo-router';
export { ErrorBoundary } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider, useTheme } from '@/theme';
import { I18nProvider, useI18n } from '@/i18n';

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
    <SafeAreaProvider>
      <I18nProvider>
        <ThemeProvider>
          <RootLayoutNav />
        </ThemeProvider>
      </I18nProvider>
    </SafeAreaProvider>
  );
}
