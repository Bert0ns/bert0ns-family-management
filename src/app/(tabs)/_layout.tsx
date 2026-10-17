import { useEffect, type ComponentType } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Pressable,
  useWindowDimensions,
  type ColorValue,
} from 'react-native';
import { Tabs } from 'expo-router';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LayoutDashboard, PieChart, ReceiptText, Users, Settings } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Radius } from '@/theme/tokens';
import { useI18n } from '@/i18n';
import { SyncBadge } from '@/components/common/SyncBadge';
import { useAppStore } from '@/services/store';
import { authService } from '@/services/authService';
import { syncEngine } from '@/services/syncEngine';
import { realtimeSync } from '@/services/realtimeSync';
import { isValidUUID } from '@/utils/uuid';

export default function TabsLayout() {
  const { theme } = useTheme();
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const { width: windowWidth } = useWindowDimensions();
  const family = useAppStore((s) => s.family);

  // Floating dock dimensions
  const isWideScreen = windowWidth >= 768;
  const barWidth = isWideScreen ? Math.min(windowWidth - 48, 520) : windowWidth - 28;
  const barLeft = Math.max(14, (windowWidth - barWidth) / 2);
  const floatingBottom = Math.max(insets.bottom, 12) + (Platform.OS === 'ios' ? 4 : 8);

  // Global Sync & Auth Lifecycle Bootstrap
  useEffect(() => {
    let isMounted = true;

    async function initSync() {
      if (!authService.isConfigured()) return;

      const session = await authService.getSession();
      if (!isMounted) return;

      if (session?.user && family?.id && isValidUUID(family.id)) {
        realtimeSync.startRealtimeSync(family.id);
        syncEngine.fetchDelta(family.id).catch(() => {});
        syncEngine.flushOutbox().catch(() => {});
      }
    }

    initSync();

    const authSub = authService.onAuthStateChange(async (session, _user) => {
      if (!isMounted) return;
      const currentFam = useAppStore.getState().family;
      if (session?.user && currentFam?.id && isValidUUID(currentFam.id)) {
        realtimeSync.startRealtimeSync(currentFam.id);
        syncEngine.fetchDelta(currentFam.id).catch(() => {});
        syncEngine.flushOutbox().catch(() => {});
      } else if (!session?.user) {
        realtimeSync.stopRealtimeSync();
      }
    });

    return () => {
      isMounted = false;
      authSub?.unsubscribe?.();
      realtimeSync.stopRealtimeSync();
    };
  }, [family?.id]);

  const renderTabIcon = (
    IconComponent: ComponentType<{ size: number; color: string; strokeWidth?: number }>,
    focused: boolean,
    color: ColorValue | string,
    label: string,
  ) => (
    <View
      accessibilityLabel={label}
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        width: 48,
        height: 48,
      }}
    >
      <View
        style={{
          width: 42,
          height: 36,
          borderRadius: Radius.dockInner,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: focused
            ? (theme.colors.dockActivePill ?? theme.colors.brandLight)
            : 'transparent',
          borderWidth: focused ? 1 : 0,
          borderColor: focused
            ? (theme.colors.dockActiveBorder ?? `${theme.colors.brand}4D`)
            : 'transparent',
        }}
      >
        <IconComponent
          size={21}
          color={focused ? theme.colors.brand : (color as string)}
          strokeWidth={focused ? 2.5 : 2}
        />
      </View>
    </View>
  );

  return (
    <Tabs
      detachInactiveScreens={false}
      screenOptions={{
        animation: 'none',
        sceneStyle: {
          backgroundColor: theme.colors.background,
        },
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
                borderRadius: Radius.dock,
                overflow: 'hidden',
                backgroundColor: theme.colors.dockBg ?? theme.colors.bottomBarBg,
              },
            ]}
          />
        ),
        tabBarStyle: {
          position: 'absolute',
          bottom: floatingBottom,
          left: barLeft,
          width: barWidth,
          height: 60,
          backgroundColor: 'transparent',
          borderRadius: Radius.dock,
          borderWidth: 1,
          borderColor: theme.colors.dockBorder ?? theme.colors.bottomBarBorder,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: theme.isDark ? 0.2 : 0.04,
          shadowRadius: 4,
          elevation: 2,
          paddingTop: 0,
          paddingBottom: 0,
          paddingHorizontal: 6,
          overflow: Platform.OS === 'android' ? 'hidden' : 'visible',
        },
        tabBarButton: ({ ref: _ref, style, onPress, ...rest }: any) => (
          <Pressable
            {...rest}
            onPress={(e: any) => {
              if (Platform.OS === 'web' && e) {
                const hasModifierKey = e.metaKey || e.altKey || e.ctrlKey || e.shiftKey;
                const isLeftClick = e.button == null || e.button === 0;
                if (!hasModifierKey && isLeftClick && typeof e.preventDefault === 'function') {
                  e.preventDefault();
                }
              }
              onPress?.(e);
            }}
            style={[
              style,
              {
                justifyContent: 'center',
                alignItems: 'center',
                padding: 0,
                paddingTop: 0,
                paddingBottom: 0,
                height: '100%',
              },
            ]}
          />
        ),
        tabBarIconStyle: {
          width: 48,
          height: 48,
          justifyContent: 'center',
          alignItems: 'center',
          margin: 0,
          padding: 0,
        },
        tabBarItemStyle: {
          flex: 1,
          minWidth: 0,
          justifyContent: 'center',
          alignItems: 'center',
          height: 60,
          padding: 0,
          margin: 0,
        },
        headerStyle: {
          backgroundColor: theme.colors.background,
        },
        headerTitleStyle: {
          fontWeight: '700',
          fontSize: 19,
          color: theme.colors.textPrimary,
        },
        headerTintColor: theme.colors.textPrimary,
        headerShadowVisible: false,
        headerRight: () => <SyncBadge showLabel={false} />,
        headerRightContainerStyle: { paddingRight: 16 },
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
          title: t.tabs.import,
          headerTitle: t.tabs.import,
          tabBarButton: () => null,
          tabBarItemStyle: { display: 'none', width: 0, height: 0, flex: 0 },
        }}
      />
    </Tabs>
  );
}
