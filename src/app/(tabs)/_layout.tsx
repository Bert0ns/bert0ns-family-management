import { View, StyleSheet, Platform } from 'react-native';
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

  const floatingBottom = Math.max(insets.bottom, 16);

  const renderTabIcon = (IconComponent: any, focused: boolean, color: any, label: string) => (
    <View
      accessibilityLabel={label}
      style={{
        width: 48,
        height: 48,
        borderRadius: 24,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: focused ? theme.colors.brandLight : 'transparent',
        borderWidth: focused ? 1.5 : 0,
        borderColor: focused ? `${theme.colors.brand}4D` : 'transparent',
      }}
    >
      <IconComponent
        size={24}
        color={focused ? theme.colors.brand : color}
        strokeWidth={focused ? 2.5 : 2}
      />
    </View>
  );

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.brand,
        tabBarInactiveTintColor: theme.colors.textMuted,
        tabBarShowLabel: false,
        tabBarBackground: () => (
          <BlurView
            intensity={90}
            tint={theme.isDark ? 'dark' : 'light'}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 32,
                overflow: 'hidden',
                backgroundColor: theme.colors.bottomBarBg,
              },
            ]}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: floatingBottom,
          left: 20,
          right: 20,
          height: 64,
          backgroundColor: 'transparent',
          borderRadius: 32,
          borderWidth: 1.5,
          borderColor: theme.colors.bottomBarBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 10 },
          shadowOpacity: theme.isDark ? 0.5 : 0.12,
          shadowRadius: 24,
          elevation: 12,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 8,
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
        },
        tabBarItemStyle: {
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          height: 64,
          padding: 0,
          margin: 0,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 20,
          color: theme.colors.textPrimary,
        },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
        headerRight: () => <SyncBadge />,
        headerRightContainerStyle: { paddingRight: 20 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t.tabs.dashboard,
          headerTitle: t.tabs.dashboard,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(LayoutDashboard, focused, color, t.tabs.dashboard),
          tabBarAccessibilityLabel: t.tabs.dashboard,
        }}
      />
      <Tabs.Screen
        name="ledger"
        options={{
          title: t.tabs.ledger,
          headerTitle: t.tabs.ledger,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(ReceiptText, focused, color, t.tabs.ledger),
          tabBarAccessibilityLabel: t.tabs.ledger,
        }}
      />
      <Tabs.Screen
        name="analytics"
        options={{
          title: t.tabs.analytics,
          headerTitle: t.tabs.analytics,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(PieChart, focused, color, t.tabs.analytics),
          tabBarAccessibilityLabel: t.tabs.analytics,
        }}
      />
      <Tabs.Screen
        name="family"
        options={{
          title: t.tabs.family,
          headerTitle: t.tabs.family,
          tabBarIcon: ({ focused, color }) => renderTabIcon(Users, focused, color, t.tabs.family),
          tabBarAccessibilityLabel: t.tabs.family,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t.tabs.settings,
          headerTitle: t.tabs.settings,
          tabBarIcon: ({ focused, color }) =>
            renderTabIcon(Settings, focused, color, t.tabs.settings),
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
