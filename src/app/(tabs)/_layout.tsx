import React from 'react';
import { StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, PieChart, ReceiptText, Users, Settings } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { useI18n } from '@/i18n';
import { SyncBadge } from '@/components/common/SyncBadge';

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
        tabBarShowLabel: false,
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
          left: 20,
          right: 20,
          height: 58,
          backgroundColor: 'transparent',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.85)',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 8 },
          shadowOpacity: theme.isDark ? 0.4 : 0.12,
          shadowRadius: 20,
          elevation: 10,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 0,
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: 58,
          padding: 0,
          margin: 0,
        },
        tabBarLabelPosition: 'beside-icon',
        headerStyle: {
          backgroundColor: theme.colors.surface,
        },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
        headerRight: () => <SyncBadge />,
        headerRightContainerStyle: { paddingRight: 16 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.dashboard,
          headerTitle: t.tabs.dashboard,
          tabBarIcon: ({ color }) => <LayoutDashboard size={22} color={color} />,
          tabBarAccessibilityLabel: t.tabs.dashboard,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t.tabs.ledger,
          headerTitle: t.tabs.ledger,
          tabBarIcon: ({ color }) => <ReceiptText size={22} color={color} />,
          tabBarAccessibilityLabel: t.tabs.ledger,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.tabs.analytics,
          headerTitle: t.tabs.analytics,
          tabBarIcon: ({ color }) => <PieChart size={22} color={color} />,
          tabBarAccessibilityLabel: t.tabs.analytics,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t.tabs.family,
          headerTitle: t.tabs.family,
          tabBarIcon: ({ color }) => <Users size={22} color={color} />,
          tabBarAccessibilityLabel: t.tabs.family,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          headerTitle: t.tabs.settings,
          tabBarIcon: ({ color }) => <Settings size={22} color={color} />,
          tabBarAccessibilityLabel: t.tabs.settings,
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
