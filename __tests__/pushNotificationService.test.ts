import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { pushNotificationService } from '@/services/pushNotificationService';
import { supabase, isSupabaseConfigured } from '@/services/supabase';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
    },
  };
});

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getExpoPushTokenAsync: jest.fn(),
  setNotificationChannelAsync: jest.fn(),
  AndroidImportance: {
    MAX: 5,
  },
}));

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: {
    expoConfig: {
      extra: {
        eas: {
          projectId: 'mock-eas-project-id',
        },
      },
    },
    easConfig: {
      projectId: 'mock-eas-project-id',
    },
  },
}));

describe('pushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    pushNotificationService.resetState();
  });

  describe('isSupported', () => {
    it('returns false on web platform', () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'web';
        expect(pushNotificationService.isSupported()).toBe(false);
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('returns true on native platforms', () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        expect(pushNotificationService.isSupported()).toBe(true);
        Platform.OS = 'android';
        expect(pushNotificationService.isSupported()).toBe(true);
      } finally {
        Platform.OS = originalOS;
      }
    });
  });

  describe('registerForPushNotificationsAsync', () => {
    it('returns null if no userId is provided', async () => {
      const token = await pushNotificationService.registerForPushNotificationsAsync('');
      expect(token).toBeNull();
    });

    it('returns null on Web platform', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'web';
        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');
        expect(token).toBeNull();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('registers token on iOS with expo_push_token schema mapping and EAS projectId', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[mock-ios-token]',
        });

        const upsertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBe('ExponentPushToken[mock-ios-token]');
        expect(pushNotificationService.getActiveDeviceToken()).toBe(
          'ExponentPushToken[mock-ios-token]',
        );
        expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
        expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith({
          projectId: 'mock-eas-project-id',
        });
        expect(Notifications.setNotificationHandler).toHaveBeenCalled();
        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user_1',
            expo_push_token: 'ExponentPushToken[mock-ios-token]',
            platform: 'ios',
          }),
          { onConflict: 'expo_push_token' },
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('configures Android notification channel prior to registration on Android', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'android';
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'undetermined',
        });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'granted',
        });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[mock-android-token]',
        });

        const upsertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_2');

        expect(token).toBe('ExponentPushToken[mock-android-token]');
        expect(pushNotificationService.getActiveDeviceToken()).toBe(
          'ExponentPushToken[mock-android-token]',
        );
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
          name: 'Family Activity & Alerts',
          importance: 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });
        expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user_2',
            expo_push_token: 'ExponentPushToken[mock-android-token]',
            platform: 'android',
          }),
          { onConflict: 'expo_push_token' },
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('falls back to undefined projectId when Constants has no EAS projectId', async () => {
      const originalOS = Platform.OS;
      const prevExpoConfig = Constants.expoConfig;
      const prevEasConfig = Constants.easConfig;
      try {
        Platform.OS = 'ios';
        (Constants as any).expoConfig = null;
        (Constants as any).easConfig = null;

        (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[no-project-token]',
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBe('ExponentPushToken[no-project-token]');
        expect(Notifications.getExpoPushTokenAsync).toHaveBeenCalledWith(undefined);
      } finally {
        Platform.OS = originalOS;
        (Constants as any).expoConfig = prevExpoConfig;
        (Constants as any).easConfig = prevEasConfig;
      }
    });

    it('returns null if permissions are denied by user', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'denied' });
        (Notifications.requestPermissionsAsync as jest.Mock).mockResolvedValue({
          status: 'denied',
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBeNull();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('handles Supabase upsert error gracefully and still returns token', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[mock-ios-token]',
        });

        const upsertMock = jest
          .fn()
          .mockResolvedValue({ error: { message: 'Database constraint error' } });
        (supabase.from as jest.Mock).mockReturnValue({
          upsert: upsertMock,
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBe('ExponentPushToken[mock-ios-token]');
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('returns token when Supabase is not configured without calling upsert', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[offline-token]',
        });

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBe('ExponentPushToken[offline-token]');
        expect(supabase.from).not.toHaveBeenCalled();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('catches unexpected thrown errors and returns null', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (Notifications.getPermissionsAsync as jest.Mock).mockRejectedValue(
          new Error('Device push services unavailable'),
        );

        const token = await pushNotificationService.registerForPushNotificationsAsync('user_1');

        expect(token).toBeNull();
      } finally {
        Platform.OS = originalOS;
      }
    });
  });

  describe('setupNotificationChannelAsync', () => {
    it('does nothing on non-android platforms', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        await pushNotificationService.setupNotificationChannelAsync();
        expect(Notifications.setNotificationChannelAsync).not.toHaveBeenCalled();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('configures channel on Android', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'android';
        await pushNotificationService.setupNotificationChannelAsync();
        expect(Notifications.setNotificationChannelAsync).toHaveBeenCalledWith('default', {
          name: 'Family Activity & Alerts',
          importance: 5,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#10B981',
          sound: 'default',
        });
      } finally {
        Platform.OS = originalOS;
      }
    });
  });

  describe('unregisterPushTokenAsync', () => {
    it('returns early when userId is empty or Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      await pushNotificationService.unregisterPushTokenAsync('user_1');
      expect(supabase.from).not.toHaveBeenCalled();

      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      await pushNotificationService.unregisterPushTokenAsync('');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('deletes token successfully from Supabase when no token is cached or passed', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      await pushNotificationService.unregisterPushTokenAsync('user_1');

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user_1');
    });

    it('deletes only specific device token when explicitly passed (multi-device scoping)', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const eqTokenMock = jest.fn().mockResolvedValue({ error: null });
      const eqUserMock = jest.fn().mockReturnValue({ eq: eqTokenMock });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqUserMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      await pushNotificationService.unregisterPushTokenAsync(
        'user_1',
        'ExponentPushToken[ipad-token]',
      );

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user_1');
      expect(eqTokenMock).toHaveBeenCalledWith('expo_push_token', 'ExponentPushToken[ipad-token]');
    });

    it('automatically uses cached active device token and clears it after unregistration', async () => {
      const originalOS = Platform.OS;
      try {
        Platform.OS = 'ios';
        (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
        (Notifications.getPermissionsAsync as jest.Mock).mockResolvedValue({ status: 'granted' });
        (Notifications.getExpoPushTokenAsync as jest.Mock).mockResolvedValue({
          data: 'ExponentPushToken[active-iphone-token]',
        });

        const upsertMock = jest.fn().mockResolvedValue({ error: null });
        (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

        await pushNotificationService.registerForPushNotificationsAsync('user_1');
        expect(pushNotificationService.getActiveDeviceToken()).toBe(
          'ExponentPushToken[active-iphone-token]',
        );

        // Now unregister without explicit token parameter
        const eqTokenMock = jest.fn().mockResolvedValue({ error: null });
        const eqUserMock = jest.fn().mockReturnValue({ eq: eqTokenMock });
        const deleteMock = jest.fn().mockReturnValue({ eq: eqUserMock });
        (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

        await pushNotificationService.unregisterPushTokenAsync('user_1');

        expect(eqUserMock).toHaveBeenCalledWith('user_id', 'user_1');
        expect(eqTokenMock).toHaveBeenCalledWith(
          'expo_push_token',
          'ExponentPushToken[active-iphone-token]',
        );
        expect(pushNotificationService.getActiveDeviceToken()).toBeNull();
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('handles Supabase delete error gracefully', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const eqMock = jest.fn().mockResolvedValue({ error: { message: 'Network timeout' } });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      await expect(
        pushNotificationService.unregisterPushTokenAsync('user_1'),
      ).resolves.not.toThrow();
    });

    it('catches unexpected thrown errors during unregistration', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.from as jest.Mock).mockImplementation(() => {
        throw new Error('Supabase client failed');
      });

      await expect(
        pushNotificationService.unregisterPushTokenAsync('user_1'),
      ).resolves.not.toThrow();
    });
  });
});
