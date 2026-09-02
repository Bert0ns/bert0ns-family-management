import React from 'react';
import { Tabs } from 'expo-router';
import { LayoutDashboard, PieChart, ReceiptText, UploadCloud, Users } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.border,
          height: 60,
          paddingBottom: 8,
          paddingTop: 8,
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
          tabBarIcon: ({ color, size }) => <LayoutDashboard size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.tabs.analytics,
          headerTitle: t.tabs.analytics,
          tabBarIcon: ({ color, size }) => <PieChart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t.tabs.ledger,
          headerTitle: t.tabs.ledger,
          tabBarIcon: ({ color, size }) => <ReceiptText size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="import"
        options={{
          title: t.tabs.import,
          headerTitle: t.tabs.import,
          tabBarIcon: ({ color, size }) => <UploadCloud size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t.tabs.family,
          headerTitle: t.tabs.family,
          tabBarIcon: ({ color, size }) => <Users size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
