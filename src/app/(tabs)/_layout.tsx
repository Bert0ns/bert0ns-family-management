import React from 'react';
import { Tabs } from 'expo-router';
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
        tabBarStyle: {
          position: 'absolute',
          bottom: floatingBottom,
          left: 16,
          right: 16,
          height: 64,
          backgroundColor: theme.colors.surface,
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.isDark ? theme.colors.border : 'rgba(0, 0, 0, 0.08)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: theme.isDark ? 0.35 : 0.08,
          shadowRadius: 12,
          elevation: 8,
          paddingTop: 8,
          paddingBottom: 8,
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
