import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';

// Type-only imports ensure zero runtime bundle overhead or native side-effects on Web
import type * as NotificationsType from 'expo-notifications';
import type ConstantsType from 'expo-constants';

/**
 * Safely resolves the expo-notifications module on native platforms (iOS/Android).
 * In a web environment, native notification modules are deactivated and return null.
 */
function getNotificationsModule(): typeof NotificationsType | null {
  if (Platform.OS === 'web') {
    return null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require('expo-notifications');
  } catch (err: unknown) {
    supabaseLogger.warn('expo-notifications module could not be loaded', {
      error: err instanceof Error ? err.message : String(err),
    });
    return null;
  }
}

/**
 * Safely resolves the expo-constants module to extract EAS project ID.
 */
function getConstantsModule(): typeof ConstantsType | null {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require('expo-constants');
    return mod?.default ?? mod ?? null;
  } catch {
    return null;
  }
}

let isForegroundHandlerConfigured = false;
let activeDeviceToken: string | null = null;

function ensureForegroundNotificationHandler(Notifications: typeof NotificationsType | null): void {
  if (Platform.OS === 'web' || isForegroundHandlerConfigured || !Notifications) {
    return;
  }
  try {
    Notifications.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    isForegroundHandlerConfigured = true;
  } catch (err: unknown) {
    supabaseLogger.warn('Failed to configure foreground notification handler', {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}

export const pushNotificationService = {
  /**
   * Check whether push notifications are supported and active on the current platform.
   */
  isSupported(): boolean {
    return Platform.OS !== 'web';
  },

  /**
   * Returns the cached active device push token if registered during the current session.
   */
  getActiveDeviceToken(): string | null {
    return activeDeviceToken;
  },

  /**
   * Resets internal state for unit test isolation.
   */
  resetState(): void {
    activeDeviceToken = null;
    isForegroundHandlerConfigured = false;
  },

  /**
   * Configures Android Notification Channel with sound, vibration, and lights.
   * Required for Android 8.0+ (API level 26+).
   */
  async setupNotificationChannelAsync(): Promise<void> {
    if (Platform.OS !== 'android') {
      return;
    }
    const Notifications = getNotificationsModule();
    if (!Notifications?.setNotificationChannelAsync) {
      return;
    }
    try {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Family Activity & Alerts',
        importance: Notifications.AndroidImportance?.MAX ?? 5,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#10B981',
        sound: 'default',
      });
    } catch (err: unknown) {
      supabaseLogger.warn('Failed to configure Android notification channel', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },

  /**
   * Request push notification permissions and sync the Expo push token with Supabase.
   * Completely guarded and deactivated on web platform.
   */
  async registerForPushNotificationsAsync(userId: string): Promise<string | null> {
    if (!userId) {
      supabaseLogger.warn('Cannot register push token without a valid userId');
      return null;
    }

    if (Platform.OS === 'web') {
      supabaseLogger.debug('Push notifications via Expo token not registered on Web platform');
      return null;
    }

    const Notifications = getNotificationsModule();
    if (!Notifications) {
      supabaseLogger.warn(
        'Push notification service unavailable: native notifications module not loaded',
      );
      return null;
    }

    // Configure foreground presentation handler without module-load side effects
    ensureForegroundNotificationHandler(Notifications);

    try {
      // Set up Android notification channel prior to token registration
      if (Platform.OS === 'android') {
        await this.setupNotificationChannelAsync();
      }

      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;

      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        supabaseLogger.info('Push notification permission not granted', { status: finalStatus });
        return null;
      }

      // Resolve EAS projectId for SDK 50+ standalone/EAS builds
      const Constants = getConstantsModule();
      const projectId =
        Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
      const tokenResponse = await Notifications.getExpoPushTokenAsync(
        projectId ? { projectId } : undefined,
      );
      const token = tokenResponse.data;
      activeDeviceToken = token;

      supabaseLogger.info('Obtained Expo Push Token', { token: token.slice(0, 15) + '...' });

      // Persist token in Supabase
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            expo_push_token: token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'expo_push_token' },
        );

        if (error) {
          supabaseLogger.error('Failed to store push token in Supabase', { error: error.message });
        } else {
          supabaseLogger.info('Successfully synced push token to Supabase');
        }
      }

      return token;
    } catch (err: unknown) {
      supabaseLogger.error('Error during push notification registration', {
        error: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  },

  /**
   * Unregister / remove push token when signing out or disabling push notifications.
   * If a specific token is provided (or cached for this device), only that device token is removed,
   * avoiding accidental revocation across other devices belonging to the user.
   */
  async unregisterPushTokenAsync(userId: string, token?: string): Promise<void> {
    if (!userId || !isSupabaseConfigured()) {
      return;
    }

    const tokenToRemove = token ?? activeDeviceToken;

    try {
      let query = supabase.from('push_tokens').delete().eq('user_id', userId);
      if (tokenToRemove) {
        query = query.eq('expo_push_token', tokenToRemove);
      }
      const { error } = await query;
      if (error) {
        supabaseLogger.error('Failed to unregister push token', { error: error.message });
      } else {
        supabaseLogger.info('Unregistered push token from Supabase');
        if (tokenToRemove === activeDeviceToken) {
          activeDeviceToken = null;
        }
      }
    } catch (err: unknown) {
      supabaseLogger.error('Error removing push token', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
