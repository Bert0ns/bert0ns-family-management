import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';

// Configure foreground notification presentation
if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export const pushNotificationService = {
  /**
   * Request push notification permissions and sync the Expo push token with Supabase.
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
