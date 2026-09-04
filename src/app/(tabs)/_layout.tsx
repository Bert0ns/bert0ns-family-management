import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, PieChart, ReceiptText, Users, Settings } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  const floatingBottom = Math.max(insets.bottom, 12);

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: true,
        tabBarAllowFontScaling: false,
        tabBarBackground: () => (
          <BlurView
            intensity={85}
            tint={theme.isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 24,
                overflow: 'hidden',
                backgroundColor: theme.isDark
                  ? 'rgba(22, 23, 31, 0.72)'
                  : 'rgba(255, 255, 255, 0.75)',
              },
            ]}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: floatingBottom,
          left: 16,
          right: 16,
          height: 64,
          backgroundColor: 'transparent',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.85)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.isDark ? 0.4 : 0.12,
          shadowRadius: 20,
          elevation: 10,
          paddingTop: 8,
          paddingBottom: 8,
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
        },
        tabBarItemStyle: {
          paddingVertical: 2,
          paddingHorizontal: 2,
          justifyContent: 'center',
          alignItems: 'center',
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: -0.2,
          marginTop: 2,
          marginBottom: 0,
          textAlign: 'center',
          includeFontPadding: false,
        },
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.dashboard,
          headerTitle: t.tabs.dashboard,
          tabBarIcon: ({ color }) => <LayoutDashboard size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t.tabs.ledger,
          headerTitle: t.tabs.ledger,
          tabBarIcon: ({ color }) => <ReceiptText size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.tabs.analytics,
          headerTitle: t.tabs.analytics,
          tabBarIcon: ({ color }) => <PieChart size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t.tabs.family,
          headerTitle: t.tabs.family,
          tabBarIcon: ({ color }) => <Users size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          headerTitle: t.tabs.settings,
          tabBarIcon: ({ color }) => <Settings size={20} color={color} />,
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          href: null,
          title: t.tabs.import,
          headerTitle: t.tabs.import,
        }}
      />
    </Tabs>
  );
}
