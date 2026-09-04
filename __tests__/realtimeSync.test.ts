import { realtimeSync } from '@/services/realtimeSync';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';

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
    },
  };
});

describe('realtimeSync', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useAppStore.getState().resetToSampleData();
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

  it('reconciles store when an expense INSERT event occurs', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    const listeners: Record<string, (payload: any) => void> = {};
    const mockChannel: any = {
      on: jest.fn(),
      subscribe: jest.fn(),
    };
    mockChannel.on.mockImplementation(
      (_type: string, config: { table: string }, callback: (payload: any) => void) => {
        listeners[config.table] = callback;
        return mockChannel;
      },
    );

    (supabase.channel as jest.Mock).mockReturnValue(mockChannel);

    realtimeSync.startRealtimeSync('fam_123');

    // Simulate an incoming remote expense insert
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

    const expenses = useAppStore.getState().expenses;
    const added = expenses.find((e) => e.id === 'remote-exp-1');
    expect(added).toBeDefined();
    expect(added?.merchant_name).toBe('Supermarket');
  });

  it('stops realtime sync and removes channel cleanly', () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    realtimeSync.startRealtimeSync('fam_123');
    expect(realtimeSync.isRealtimeActive()).toBe(true);

    realtimeSync.stopRealtimeSync();
    expect(realtimeSync.isRealtimeActive()).toBe(false);
    expect(supabase.removeChannel).toHaveBeenCalled();
  });
});
