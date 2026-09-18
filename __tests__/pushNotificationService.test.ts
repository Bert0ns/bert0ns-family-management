import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
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
}));

describe('pushNotificationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    it('registers token on native platform when permissions are already granted', async () => {
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
        expect(upsertMock).toHaveBeenCalledWith(
          expect.objectContaining({
            user_id: 'user_1',
            token: 'ExponentPushToken[mock-ios-token]',
            platform: 'ios',
          }),
          { onConflict: 'user_id,token' },
        );
      } finally {
        Platform.OS = originalOS;
      }
    });

    it('requests permissions when not initially granted and succeeds if granted', async () => {
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
        expect(Notifications.requestPermissionsAsync).toHaveBeenCalled();
      } finally {
        Platform.OS = originalOS;
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

  describe('unregisterPushTokenAsync', () => {
    it('returns early when userId is empty or Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      await pushNotificationService.unregisterPushTokenAsync('user_1');
      expect(supabase.from).not.toHaveBeenCalled();

      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      await pushNotificationService.unregisterPushTokenAsync('');
      expect(supabase.from).not.toHaveBeenCalled();
    });

    it('deletes token successfully from Supabase', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      await pushNotificationService.unregisterPushTokenAsync('user_1');

      expect(supabase.from).toHaveBeenCalledWith('push_tokens');
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('user_id', 'user_1');
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
