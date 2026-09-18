import { Platform } from 'react-native';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';

// Type-only import ensures zero runtime bundle overhead or native side-effects on Web
import type * as NotificationsType from 'expo-notifications';

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

// Configure foreground notification presentation only on native platforms
if (Platform.OS !== 'web') {
  try {
    const Notifications = getNotificationsModule();
    Notifications?.setNotificationHandler?.({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
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

    try {
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

      const tokenResponse = await Notifications.getExpoPushTokenAsync();
      const token = tokenResponse.data;

      supabaseLogger.info('Obtained Expo Push Token', { token: token.slice(0, 15) + '...' });

      // Persist token in Supabase
      if (isSupabaseConfigured()) {
        const { error } = await supabase.from('push_tokens').upsert(
          {
            user_id: userId,
            token,
            platform: Platform.OS,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id,token' },
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
   * Unregister / remove push token when signing out.
   */
  async unregisterPushTokenAsync(userId: string): Promise<void> {
    if (!userId || !isSupabaseConfigured()) {
      return;
    }

    try {
      const { error } = await supabase.from('push_tokens').delete().eq('user_id', userId);
      if (error) {
        supabaseLogger.error('Failed to unregister push token', { error: error.message });
      } else {
        supabaseLogger.info('Unregistered push token from Supabase');
      }
    } catch (err: unknown) {
      supabaseLogger.error('Error removing push token', {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
};
