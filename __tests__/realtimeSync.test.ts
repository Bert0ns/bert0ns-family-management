import { realtimeSync } from '@/services/realtimeSync';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';
import { syncEngine } from '@/services/syncEngine';

jest.mock('@/services/syncEngine', () => ({
  syncEngine: {
    fetchDelta: jest.fn().mockResolvedValue({
      pulledExpenses: 0,
      pulledCategories: 0,
      pulledMembers: 0,
      pulledSettlements: 0,
      pulledNotifications: 0,
      pulledFamily: false,
    }),
  },
}));

jest.mock('@/services/supabase', () => {
  const channelMock: any = {
    on: jest.fn(),
    subscribe: jest.fn((cb?: (status: string) => void) => {
      if (cb) cb('SUBSCRIBED');
      return channelMock;
    }),
  };
  channelMock.on.mockReturnValue(channelMock);

  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      channel: jest.fn(() => channelMock),
      removeChannel: jest.fn(),
      from: jest.fn(() => ({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            data: [{ member_id: 'm1', share_amount: 10, percentage: 50 }],
            error: null,
          }),
        }),
      })),
    },
  };
});

describe('realtimeSync', () => {
  let listeners: Record<string, (payload: any) => void> = {};
  let subscribeStatusCallback: ((status: string) => void) | null = null;
  let mockChannel: any;

  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetToSampleData();

    listeners = {};
    subscribeStatusCallback = null;
    mockChannel = {
      on: jest.fn((_type: string, config: { table: string }, callback: (payload: any) => void) => {
        listeners[config.table] = callback;
        return mockChannel;
      }),
      subscribe: jest.fn((cb?: (status: string) => void) => {
        if (cb) subscribeStatusCallback = cb;
        return mockChannel;
      }),
    };
    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);
  });

  afterEach(() => {
    realtimeSync.stopRealtimeSync();
  });

  it('does not start if Supabase is not configured', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
    realtimeSync.startRealtimeSync('fam_123');
    expect(realtimeSync.isRealtimeActive()).toBe(false);
  });

  it('starts and configures channel subscriptions when configured', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_123');

    expect(realtimeSync.isRealtimeActive()).toBe(true);
    expect(realtimeSync.getCurrentFamilyId()).toBe('fam_123');
    expect(supabase.channel).toHaveBeenCalledWith('family_realtime_fam_123');
  });

  it('does not recreate channel if already active for same family', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_123');
    expect(supabase.channel).toHaveBeenCalledTimes(1);

    realtimeSync.startRealtimeSync('fam_123');
    expect(supabase.channel).toHaveBeenCalledTimes(1);
  });

  it('recreates channel if started for a different family', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_1');
    expect(supabase.channel).toHaveBeenCalledWith('family_realtime_fam_1');

    realtimeSync.startRealtimeSync('fam_2');
    expect(supabase.channel).toHaveBeenCalledWith('family_realtime_fam_2');
    expect(realtimeSync.getCurrentFamilyId()).toBe('fam_2');
  });

  it('runs catch-up delta sync when channel status changes to SUBSCRIBED', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_123');
    expect(subscribeStatusCallback).toBeDefined();

    subscribeStatusCallback?.('SUBSCRIBED');
    expect(syncEngine.fetchDelta).toHaveBeenCalledWith('fam_123');

    // Handles catch-up delta error silently
    (syncEngine.fetchDelta as jest.Mock).mockRejectedValueOnce(new Error('Network drop'));
    expect(() => subscribeStatusCallback?.('SUBSCRIBED')).not.toThrow();
  });

  describe('Expenses events', () => {
    it('reconciles store when an expense INSERT event occurs and fetches splits', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const expenseCallback = listeners['expenses'];
      expect(expenseCallback).toBeDefined();

      expenseCallback({
        eventType: 'INSERT',
        new: {
          id: 'remote-exp-1',
          family_id: 'fam_123',
          paid_by_member_id: 'mem_1',
          category_id: 'cat_groceries',
          transaction_date: '2026-09-04',
          merchant_name: 'Supermarket',
          amount: 32.5,
          created_at: new Date().toISOString(),
        },
      });

      // Wait a tick for async split fetch
      await new Promise((r) => setTimeout(r, 20));

      const expenses = useAppStore.getState().expenses;
      const added = expenses.find((e) => e.id === 'remote-exp-1');
      expect(added).toBeDefined();
      expect(added?.merchant_name).toBe('Supermarket');
      expect(added?.splits).toHaveLength(1);
    });

    it('handles expense INSERT when split query throws an exception', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      (supabase.from as jest.Mock).mockReturnValueOnce({
        select: jest.fn().mockReturnValue({
          eq: jest.fn().mockRejectedValue(new Error('Split table offline')),
        }),
      });

      realtimeSync.startRealtimeSync('fam_123');
      const expenseCallback = listeners['expenses'];

      expenseCallback({
        eventType: 'INSERT',
        new: {
          id: 'remote-exp-no-split',
          family_id: 'fam_123',
          paid_by_member_id: 'mem_1',
          category_id: 'cat_groceries',
          transaction_date: '2026-09-04',
          merchant_name: 'Corner Store',
          amount: 15.0,
          created_at: new Date().toISOString(),
        },
      });

      await new Promise((r) => setTimeout(r, 20));

      const expenses = useAppStore.getState().expenses;
      const added = expenses.find((e) => e.id === 'remote-exp-no-split');
      expect(added).toBeDefined();
      expect(added?.merchant_name).toBe('Corner Store');
    });

    it('removes expense when DELETE event occurs', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      useAppStore.setState({
        expenses: [
          {
            id: 'exp-to-delete',
            family_id: 'fam_123',
            paid_by_member_id: 'mem_1',
            category_id: 'cat_1',
            transaction_date: '2026-09-01',
            merchant_name: 'To Delete',
            amount: 10,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const expenseCallback = listeners['expenses'];
      expenseCallback({
        eventType: 'DELETE',
        old: { id: 'exp-to-delete' },
      });

      const expenses = useAppStore.getState().expenses;
      expect(expenses.find((e) => e.id === 'exp-to-delete')).toBeUndefined();
    });
  });

  describe('Categories events', () => {
    it('reconciles category on INSERT or UPDATE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const categoryCallback = listeners['categories'];
      expect(categoryCallback).toBeDefined();

      categoryCallback({
        eventType: 'INSERT',
        new: {
          id: 'new-cat-1',
          family_id: 'fam_123',
          name: 'Home Improvement',
          icon: 'Hammer',
          color: '#E11D48',
          is_default: false,
        },
      });

      const categories = useAppStore.getState().categories;
      const found = categories.find((c) => c.id === 'new-cat-1');
      expect(found).toBeDefined();
      expect(found?.name).toBe('Home Improvement');
    });

    it('removes category on DELETE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      useAppStore.setState({
        categories: [
          {
            id: 'cat-to-delete',
            family_id: 'fam_123',
            name: 'Delete Me',
            icon: 'Trash',
            color: '#000',
          },
        ],
      });

      const categoryCallback = listeners['categories'];
      categoryCallback({
        eventType: 'DELETE',
        old: { id: 'cat-to-delete' },
      });

      const categories = useAppStore.getState().categories;
      expect(categories.find((c) => c.id === 'cat-to-delete')).toBeUndefined();
    });
  });

  describe('Family Members events', () => {
    it('reconciles member on INSERT or UPDATE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const memberCallback = listeners['family_members'];
      expect(memberCallback).toBeDefined();

      memberCallback({
        eventType: 'INSERT',
        new: {
          id: 'new-mem-1',
          family_id: 'fam_123',
          display_name: 'Aunt May',
          role: 'MEMBER',
          color_code: '#8B5CF6',
        },
      });

      const members = useAppStore.getState().members;
      const found = members.find((m) => m.id === 'new-mem-1');
      expect(found).toBeDefined();
      expect(found?.display_name).toBe('Aunt May');
    });

    it('removes member on DELETE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      useAppStore.setState({
        members: [
          {
            id: 'mem-to-remove',
            family_id: 'fam_123',
            display_name: 'Remove Me',
            role: 'MEMBER',
            color_code: '#333',
          },
        ],
      });

      const memberCallback = listeners['family_members'];
      memberCallback({
        eventType: 'DELETE',
        old: { id: 'mem-to-remove' },
      });

      const members = useAppStore.getState().members;
      expect(members.find((m) => m.id === 'mem-to-remove')).toBeUndefined();
    });
  });

  describe('Settlements events', () => {
    it('reconciles settlement on INSERT or UPDATE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const settlementCallback = listeners['settlements'];
      expect(settlementCallback).toBeDefined();

      settlementCallback({
        eventType: 'INSERT',
        new: {
          id: 'new-settle-1',
          family_id: 'fam_123',
          from_member_id: 'mem_1',
          to_member_id: 'mem_2',
          amount: 55.0,
          created_at: new Date().toISOString(),
        },
      });

      const settlements = useAppStore.getState().settlements;
      const found = settlements.find((s) => s.id === 'new-settle-1');
      expect(found).toBeDefined();
      expect(found?.amount).toBe(55.0);
    });

    it('removes settlement on DELETE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      useAppStore.setState({
        settlements: [
          {
            id: 'settle-del',
            family_id: 'fam_123',
            from_member_id: 'mem_1',
            to_member_id: 'mem_2',
            amount: 20,
            created_at: new Date().toISOString(),
          },
        ],
      });

      const settlementCallback = listeners['settlements'];
      settlementCallback({
        eventType: 'DELETE',
        old: { id: 'settle-del' },
      });

      const settlements = useAppStore.getState().settlements;
      expect(settlements.find((s) => s.id === 'settle-del')).toBeUndefined();
    });
  });

  describe('Family metadata events', () => {
    it('updates family metadata on UPDATE event', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const familyCallback = listeners['families'];
      expect(familyCallback).toBeDefined();

      familyCallback({
        eventType: 'UPDATE',
        new: {
          id: 'fam_123',
          name: 'The Updated Robinsons',
          currency: 'GBP',
          invite_code: 'NEWCODE',
          updated_at: new Date().toISOString(),
        },
      });

      const family = useAppStore.getState().family;
      expect(family.name).toBe('The Updated Robinsons');
      expect(family.currency).toBe('GBP');
      expect(family.invite_code).toBe('NEWCODE');
    });
  });

  describe('In-app Notifications events', () => {
    it('adds notification when recipient matches currentMemberId', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const currentMemberId = useAppStore.getState().currentMemberId;
      const notifCallback = listeners['notifications'];
      expect(notifCallback).toBeDefined();

      notifCallback({
        eventType: 'INSERT',
        new: {
          id: 'notif-1',
          family_id: 'fam_123',
          recipient_member_id: currentMemberId,
          actor_member_id: 'mem_other',
          type: 'EXPENSE_ADDED',
          title: 'New Expense',
          body: 'Grocery shopping added',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      });

      const notifs = useAppStore.getState().notifications;
      const found = notifs.find((n) => n.id === 'notif-1');
      expect(found).toBeDefined();
      expect(found?.title).toBe('New Expense');
    });

    it('ignores notification when recipient is a different member', () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      realtimeSync.startRealtimeSync('fam_123');

      const notifCallback = listeners['notifications'];
      notifCallback({
        eventType: 'INSERT',
        new: {
          id: 'notif-other-member',
          family_id: 'fam_123',
          recipient_member_id: 'completely-different-member',
          actor_member_id: 'mem_other',
          type: 'EXPENSE_ADDED',
          title: 'Not for me',
          body: 'Private notice',
          is_read: false,
          created_at: new Date().toISOString(),
        },
      });

      const notifs = useAppStore.getState().notifications;
      expect(notifs.find((n) => n.id === 'notif-other-member')).toBeUndefined();
    });
  });

  it('stops realtime sync and removes channel cleanly', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_123');
    expect(realtimeSync.isRealtimeActive()).toBe(true);

    realtimeSync.stopRealtimeSync();
    expect(realtimeSync.isRealtimeActive()).toBe(false);
    expect(supabase.removeChannel).toHaveBeenCalled();

    // Calling stop when already inactive does nothing
    realtimeSync.stopRealtimeSync();
    expect(realtimeSync.isRealtimeActive()).toBe(false);
  });
});
