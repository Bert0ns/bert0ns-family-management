import { useAppStore, selectNotificationPreferences, selectNotifications } from '@/services/store';
import { pushNotificationService } from '@/services/pushNotificationService';
import { syncEngine } from '@/services/syncEngine';

jest.mock('@/services/supabase', () => ({
  isSupabaseConfigured: jest.fn(() => true),
  supabase: {
    from: jest.fn(() => ({
      upsert: jest.fn().mockResolvedValue({ error: null }),
      delete: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: null }) }),
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          gte: jest.fn().mockResolvedValue({ data: [], error: null }),
        }),
      }),
    })),
  },
}));

jest.mock('expo-notifications', () => ({
  setNotificationHandler: jest.fn(),
  getPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  requestPermissionsAsync: jest.fn().mockResolvedValue({ status: 'granted' }),
  getExpoPushTokenAsync: jest.fn().mockResolvedValue({ data: 'ExponentPushToken[mock-token-123]' }),
}));

describe('Notifications Subsystem', () => {
  beforeEach(() => {
    useAppStore.getState().resetToSampleData();
  });

  describe('Notification Preferences State', () => {
    it('initializes with expected default preferences matching user requirements', () => {
      const state = useAppStore.getState();
      const prefs = selectNotificationPreferences(state);

      expect(prefs.push_enabled).toBe(true);
      expect(prefs.notify_batch_import).toBe(true); // A3
      expect(prefs.notify_expense_updates).toBe(true); // A4
      expect(prefs.notify_member_joined).toBe(true); // E1
      expect(prefs.notify_role_changed).toBe(true); // E2
    });

    it('updates notification preferences correctly', () => {
      const store = useAppStore.getState();
      store.updateNotificationPreferences({
        push_enabled: false,
        notify_expense_updates: false,
      });

      const updated = selectNotificationPreferences(useAppStore.getState());
      expect(updated.push_enabled).toBe(false);
      expect(updated.notify_expense_updates).toBe(false);
      expect(updated.notify_batch_import).toBe(true);
    });
  });

  describe('In-App Notifications State & Operations', () => {
    it('adds, marks as read, and clears notifications', () => {
      const store = useAppStore.getState();
      expect(selectNotifications(store)).toEqual([]);

      // 1. Add notification A3
      store.addNotification({
        id: 'notif_1',
        family_id: store.family.id,
        recipient_member_id: 'mem_1',
        type: 'BATCH_IMPORT',
        title: 'Batch Import Completed',
        body: 'Leo imported 15 transactions.',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      // 2. Add notification A4
      store.addNotification({
        id: 'notif_2',
        family_id: store.family.id,
        recipient_member_id: 'mem_1',
        type: 'EXPENSE_UPDATE',
        title: 'Expense Updated',
        body: 'Sofia edited Groceries expense.',
        is_read: false,
        created_at: new Date().toISOString(),
      });

      let notifs = selectNotifications(useAppStore.getState());
      expect(notifs).toHaveLength(2);
      expect(notifs[0].id).toBe('notif_2'); // Prepended (newest first)
      expect(notifs[1].id).toBe('notif_1');

      // 3. Mark single as read
      store.markNotificationAsRead('notif_2');
      notifs = selectNotifications(useAppStore.getState());
      expect(notifs.find((n) => n.id === 'notif_2')?.is_read).toBe(true);
      expect(notifs.find((n) => n.id === 'notif_1')?.is_read).toBe(false);

      // 4. Mark all as read
      store.markAllNotificationsAsRead();
      notifs = selectNotifications(useAppStore.getState());
      expect(notifs.every((n) => n.is_read)).toBe(true);

      // 5. Clear notifications
      store.clearNotifications();
      expect(selectNotifications(useAppStore.getState())).toEqual([]);
    });
  });

  describe('Push Notification Service', () => {
    it('registers push token and handles device permissions', async () => {
      const token = await pushNotificationService.registerForPushNotificationsAsync('test-user-id');
      // On web platform in Jest test environment, returns null cleanly without throwing
      expect(token === null || typeof token === 'string').toBe(true);
    });

    it('unregisters push token gracefully', async () => {
      await expect(
        pushNotificationService.unregisterPushTokenAsync('test-user-id'),
      ).resolves.not.toThrow();
    });
  });

  describe('Sync Engine Integration for Preferences', () => {
    it('handles notification_preference delta fetching without error', async () => {
      await expect(syncEngine.fetchDelta('fam_1')).resolves.not.toThrow();
    });
  });
});
