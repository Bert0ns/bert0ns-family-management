import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEngine } from '@/services/syncEngine';
import { isSupabaseConfigured } from '@/services/supabase';
import { authService } from '@/services/authService';
import { realtimeSync } from '@/services/realtimeSync';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  const authMock = {
    signOut: jest.fn().mockResolvedValue({ error: null }),
    getSession: jest.fn().mockResolvedValue({ data: { session: null } }),
  };
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
      auth: authMock,
    },
  };
});

jest.mock('@/services/realtimeSync', () => ({
  realtimeSync: {
    startRealtimeSync: jest.fn(),
    stopRealtimeSync: jest.fn(),
  },
}));

describe('Sync & Auth Remediation Tests (Partition 3)', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('preserves mutations enqueued concurrently while flushOutbox is running', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    // Mock executeMutation to simulate slow network operation
    let resolveFirstMutation: (() => void) | undefined;
    const slowPromise = new Promise<boolean>((resolve) => {
      resolveFirstMutation = () => resolve(true);
    });

    jest.spyOn(syncEngine, 'executeMutation').mockImplementationOnce(() => slowPromise);

    // Temporarily disable auto-flush so we control the flush execution
    (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

    // Enqueue first item
    await syncEngine.enqueueMutation({
      entity: 'expense',
      operation: 'INSERT',
      entity_id: 'exp-in-flight',
      payload: { id: 'exp-in-flight', amount: 30 },
    });

    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    // Start flush (in-flight)
    const flushPromise = syncEngine.flushOutbox();

    // While flush is in flight, enqueue second item
    await syncEngine.enqueueMutation({
      entity: 'expense',
      operation: 'INSERT',
      entity_id: 'exp-concurrent',
      payload: { id: 'exp-concurrent', amount: 50 },
    });

    // Complete the first mutation
    resolveFirstMutation!();
    await flushPromise;

    // The concurrent mutation MUST be preserved in the outbox
    const remainingOutbox = await syncEngine.getOutbox();
    expect(remainingOutbox.some((m) => m.entity_id === 'exp-concurrent')).toBe(true);
    expect(remainingOutbox.some((m) => m.entity_id === 'exp-in-flight')).toBe(false);
  });

  it('stops realtime listeners when user signs out', async () => {
    (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

    await authService.signOut();

    expect(realtimeSync.stopRealtimeSync).toHaveBeenCalledTimes(1);
  });
});
