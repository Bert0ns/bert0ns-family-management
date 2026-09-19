import AsyncStorage from '@react-native-async-storage/async-storage';
import { syncEngine } from '@/services/syncEngine';
import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';
import { Expense, Category, FamilyMember } from '@/types';

jest.mock('@/services/supabase', () => {
  const fromMock = jest.fn();
  return {
    isSupabaseConfigured: jest.fn(),
    supabase: {
      from: fromMock,
    },
  };
});

describe('syncEngine', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
    useAppStore.getState().resetToSampleData();
  });

  describe('Outbox Queue and Storage', () => {
    it('enqueues mutations into the AsyncStorage outbox', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);

      await syncEngine.enqueueMutation({
        entity: 'expense',
        operation: 'INSERT',
        entity_id: 'test-exp-1',
        payload: { id: 'test-exp-1', amount: 50 },
      });

      const outbox = await syncEngine.getOutbox();
      expect(outbox).toHaveLength(1);
      expect(outbox[0].entity).toBe('expense');
      expect(outbox[0].operation).toBe('INSERT');
      expect(outbox[0].entity_id).toBe('test-exp-1');
    });

    it('clears outbox cleanly', async () => {
      await syncEngine.enqueueMutation({
        entity: 'category',
        operation: 'INSERT',
        entity_id: 'cat-1',
        payload: { id: 'cat-1', name: 'Test' },
      });

      let outbox = await syncEngine.getOutbox();
      expect(outbox).toHaveLength(1);

      await syncEngine.clearOutbox();
      outbox = await syncEngine.getOutbox();
      expect(outbox).toHaveLength(0);
    });

    it('manages lastSyncTimestamp in storage', async () => {
      expect(await syncEngine.getLastSyncTimestamp()).toBeNull();
      await syncEngine.setLastSyncTimestamp('2026-09-01T00:00:00Z');
      expect(await syncEngine.getLastSyncTimestamp()).toBe('2026-09-01T00:00:00Z');
    });

    it('notifies status subscribers when status updates', () => {
      const statuses: string[] = [];
      const unsubscribe = syncEngine.subscribeSyncStatus((status) => {
        statuses.push(status);
      });

      expect(statuses.length).toBeGreaterThan(0);
      unsubscribe();
    });
  });

  describe('flushOutbox', () => {
    it('returns { processed: 0, errors: 0 } if Supabase is not configured', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      const res = await syncEngine.flushOutbox();
      expect(res).toEqual({ processed: 0, errors: 0 });
    });

    it('returns { processed: 0, errors: 0 } if outbox is empty', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      const res = await syncEngine.flushOutbox();
      expect(res).toEqual({ processed: 0, errors: 0 });
    });

    it('deduplicates concurrent flushOutbox calls', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      const upsertMock = jest
        .fn()
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve({ error: null }), 50)),
        );
      (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

      await syncEngine.enqueueMutation({
        entity: 'category',
        operation: 'INSERT',
        entity_id: 'cat-con-1',
        payload: { id: 'cat-con-1', name: 'Concurrent Test' },
      });

      const [res1, res2] = await Promise.all([syncEngine.flushOutbox(), syncEngine.flushOutbox()]);

      expect(res1).toEqual(res2);
      expect(res1.processed).toBe(1);
    });

    it('increments retry count on mutation failure and drops after 5 retries', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: jest.fn().mockResolvedValue({ error: { message: 'Database error' } }),
      });

      // Enqueue mutation with initial retry count of 4
      await syncEngine.enqueueMutation({
        entity: 'category',
        operation: 'INSERT',
        entity_id: 'cat-fail-1',
        payload: { id: 'cat-fail-1', name: 'Failing Category' },
      });

      // First failure: retry_count becomes 1
      const res1 = await syncEngine.flushOutbox();
      expect(res1.errors).toBe(1);
      let outbox = await syncEngine.getOutbox();
      expect(outbox[0].retry_count).toBe(1);

      // Manually simulate reaching retry_count = 4 in storage
      outbox[0].retry_count = 4;
      await AsyncStorage.setItem('@bert0ns_sync_outbox', JSON.stringify(outbox));

      // Second failure: retry_count becomes 5, which drops it (< 5 condition)
      const res2 = await syncEngine.flushOutbox();
      expect(res2.errors).toBe(1);

      outbox = await syncEngine.getOutbox();
      expect(outbox).toHaveLength(0);
    });
  });

  describe('executeMutation operations', () => {
    beforeEach(() => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
    });

    it('executes expense INSERT', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'expenses') return { upsert: upsertMock };
        return {};
      });

      const success = await syncEngine.executeMutation({
        id: 'mut_1',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'expense',
        operation: 'INSERT',
        entity_id: 'exp_1',
        payload: {
          id: 'exp_1',
          amount: 60,
        },
      });

      expect(success).toBe(true);
      expect(upsertMock).toHaveBeenCalled();
    });

    it('executes expense DELETE', async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      const success = await syncEngine.executeMutation({
        id: 'mut_2',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'expense',
        operation: 'DELETE',
        entity_id: 'exp_to_del',
        payload: { id: 'exp_to_del' },
      });

      expect(success).toBe(true);
      expect(deleteMock).toHaveBeenCalled();
      expect(eqMock).toHaveBeenCalledWith('id', 'exp_to_del');
    });

    it('executes category DELETE', async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ delete: deleteMock });

      const success = await syncEngine.executeMutation({
        id: 'mut_3',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'category',
        operation: 'DELETE',
        entity_id: 'cat_del',
        payload: { id: 'cat_del' },
      });

      expect(success).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('id', 'cat_del');
    });

    it('executes member INSERT/UPDATE and DELETE', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const deleteMock = jest.fn().mockReturnValue({ eq: eqMock });

      (supabase.from as jest.Mock).mockReturnValue({
        upsert: upsertMock,
        delete: deleteMock,
      });

      // Test INSERT
      const insSuccess = await syncEngine.executeMutation({
        id: 'mut_4',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'member',
        operation: 'INSERT',
        entity_id: 'mem_new',
        payload: { id: 'mem_new', display_name: 'Uncle Ben', is_current_user: true },
      });
      expect(insSuccess).toBe(true);
      expect(upsertMock).toHaveBeenCalled();

      // Test DELETE
      const delSuccess = await syncEngine.executeMutation({
        id: 'mut_5',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'member',
        operation: 'DELETE',
        entity_id: 'mem_new',
        payload: { id: 'mem_new' },
      });
      expect(delSuccess).toBe(true);
      expect(eqMock).toHaveBeenCalledWith('id', 'mem_new');
    });

    it('executes family UPDATE with and without invite_code', async () => {
      const eqMock = jest.fn().mockResolvedValue({ error: null });
      const updateMock = jest.fn().mockReturnValue({ eq: eqMock });
      (supabase.from as jest.Mock).mockReturnValue({ update: updateMock });

      const success = await syncEngine.executeMutation({
        id: 'mut_6',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'family',
        operation: 'UPDATE',
        entity_id: 'fam_1',
        payload: { name: 'The Robinsons', invite_code: 'INV123' },
      });

      expect(success).toBe(true);
      expect(updateMock).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'The Robinsons', invite_code: 'INV123' }),
      );
      expect(eqMock).toHaveBeenCalledWith('id', 'fam_1');
    });

    it('executes notification_preference UPSERT', async () => {
      const upsertMock = jest.fn().mockResolvedValue({ error: null });
      (supabase.from as jest.Mock).mockReturnValue({ upsert: upsertMock });

      const success = await syncEngine.executeMutation({
        id: 'mut_9',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'notification_preference',
        operation: 'UPDATE',
        entity_id: 'mem_1',
        payload: {
          member_id: 'mem_1',
          push_enabled: true,
          notify_batch_import: false,
          notify_expense_updates: true,
          notify_member_joined: true,
          notify_role_changed: true,
        },
      });

      expect(success).toBe(true);
      expect(upsertMock).toHaveBeenCalledWith(
        expect.objectContaining({ member_id: 'mem_1', push_enabled: true }),
      );
    });

    it('returns true for unknown entity types', async () => {
      const success = await syncEngine.executeMutation({
        id: 'mut_10',
        created_at: new Date().toISOString(),
        retry_count: 0,
        entity: 'unknown_entity' as any,
        operation: 'INSERT',
        entity_id: 'unknown_1',
        payload: {},
      });
      expect(success).toBe(true);
    });
  });

  describe('Last-Write-Wins (LWW) Merging', () => {
    it('merges categories using LWW: newer remote updates local, older remote is ignored', () => {
      const store = useAppStore.getState();
      const existingCategory = store.categories[0];

      // 1. Newer remote category updates local
      const newerRemote: Category = {
        ...existingCategory,
        name: 'Newer Name',
        updated_at: '2026-12-01T00:00:00Z',
      };
      syncEngine.mergeCategoriesLWW([newerRemote]);
      expect(
        useAppStore.getState().categories.find((c) => c.id === existingCategory.id)?.name,
      ).toBe('Newer Name');

      // 2. Older remote category does not overwrite newer local
      const olderRemote: Category = {
        ...existingCategory,
        name: 'Older Name',
        updated_at: '2025-01-01T00:00:00Z',
      };
      syncEngine.mergeCategoriesLWW([olderRemote]);
      expect(
        useAppStore.getState().categories.find((c) => c.id === existingCategory.id)?.name,
      ).toBe('Newer Name');

      // 3. Brand new remote category is added
      const brandNewCat: Category = {
        id: 'cat-brand-new',
        family_id: existingCategory.family_id,
        name: 'Brand New Category',
        icon: 'Sparkles',
        color: '#10B981',
      };
      syncEngine.mergeCategoriesLWW([brandNewCat]);
      expect(useAppStore.getState().categories.find((c) => c.id === 'cat-brand-new')).toBeDefined();
    });

    it('merges members using LWW: newer remote updates local, brand new is added', () => {
      const store = useAppStore.getState();
      const existingMember = store.members[0];

      // Newer member update
      const newerMember: FamilyMember = {
        ...existingMember,
        display_name: 'Super John',
        updated_at: '2026-11-01T00:00:00Z',
      };
      syncEngine.mergeMembersLWW([newerMember]);
      expect(
        useAppStore.getState().members.find((m) => m.id === existingMember.id)?.display_name,
      ).toBe('Super John');

      // Older member update ignored
      const olderMember: FamilyMember = {
        ...existingMember,
        display_name: 'Old John',
        updated_at: '2025-01-01T00:00:00Z',
      };
      syncEngine.mergeMembersLWW([olderMember]);
      expect(
        useAppStore.getState().members.find((m) => m.id === existingMember.id)?.display_name,
      ).toBe('Super John');

      // Brand new member
      const brandNewMember: FamilyMember = {
        id: 'mem-brand-new',
        family_id: existingMember.family_id,
        display_name: 'Cousin Greg',
        role: 'MEMBER',
        color_code: '#6366F1',
      };
      syncEngine.mergeMembersLWW([brandNewMember]);
      expect(useAppStore.getState().members.find((m) => m.id === 'mem-brand-new')).toBeDefined();
    });

    it('merges expenses using LWW: brand new remote is added and older is ignored', () => {
      const existingExpenses = useAppStore.getState().expenses;
      const existingExp = {
        ...existingExpenses[0],
        updated_at: '2026-09-01T00:00:00Z',
      };
      useAppStore.setState({
        expenses: [existingExp, ...existingExpenses.slice(1)],
      });

      // Brand new expense
      const brandNewExp: Expense = {
        id: 'exp-brand-new',
        family_id: existingExp.family_id,
        paid_by_member_id: existingExp.paid_by_member_id,
        category_id: existingExp.category_id,
        transaction_date: '2026-09-05',
        merchant_name: 'Brand New Shop',
        amount: 88,
        created_at: new Date().toISOString(),
      };
      syncEngine.mergeExpensesLWW([brandNewExp]);
      expect(useAppStore.getState().expenses.find((e) => e.id === 'exp-brand-new')).toBeDefined();

      // Older expense update ignored
      const olderExp: Expense = {
        ...existingExp,
        merchant_name: 'Old Shop Name',
        updated_at: '2024-01-01T00:00:00Z',
      };
      syncEngine.mergeExpensesLWW([olderExp]);
      expect(
        useAppStore.getState().expenses.find((e) => e.id === existingExp.id)?.merchant_name,
      ).not.toBe('Old Shop Name');
    });
  });

  describe('fetchDelta', () => {
    it('returns { updatedCount: 0 } when Supabase is not configured or familyId is empty', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(false);
      expect(await syncEngine.fetchDelta('fam_1')).toEqual({ updatedCount: 0 });

      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);
      expect(await syncEngine.fetchDelta('')).toEqual({ updatedCount: 0 });
    });

    it('fetches cloud delta and reconciles all entities', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      const mockQueryBuilder = (data: any = []) => {
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          gt: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({
            data: {
              id: 'fam_1',
              name: 'Updated Robinson Family',
              currency: 'EUR',
              updated_at: '2026-09-01',
            },
            error: null,
          }),
          then: (resolve: any) => resolve({ data, error: null }),
        };
        return builder;
      };

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'families') {
          return mockQueryBuilder();
        }
        if (table === 'expenses') {
          return mockQueryBuilder([
            {
              id: 'delta-exp-1',
              family_id: 'fam_1',
              paid_by_member_id: 'mem_1',
              category_id: 'cat_1',
              transaction_date: '2026-09-04',
              merchant_name: 'Delta Mart',
              amount: '120.50',
              updated_at: '2026-09-04T10:00:00Z',
            },
          ]);
        }
        if (table === 'categories') {
          return mockQueryBuilder([
            {
              id: 'delta-cat-1',
              family_id: 'fam_1',
              name: 'Travel & Vacation',
              icon: 'Plane',
              color: '#3B82F6',
              updated_at: '2026-09-04T10:00:00Z',
            },
          ]);
        }
        if (table === 'family_members') {
          return mockQueryBuilder([
            {
              id: 'delta-mem-1',
              family_id: 'fam_1',
              display_name: 'Delta Cousin',
              role: 'MEMBER',
              updated_at: '2026-09-04T10:00:00Z',
            },
          ]);
        }
        if (table === 'notification_preferences') {
          return mockQueryBuilder({
            member_id: 'mem_1',
            push_enabled: true,
          });
        }
        return mockQueryBuilder();
      });

      const res = await syncEngine.fetchDelta('fam_1', '2026-09-01T00:00:00Z');
      expect(res.updatedCount).toBeGreaterThanOrEqual(3);

      const store = useAppStore.getState();
      expect(store.family.name).toBe('Updated Robinson Family');
      expect(store.expenses.find((e) => e.id === 'delta-exp-1')).toBeDefined();
      expect(store.categories.find((c) => c.id === 'delta-cat-1')).toBeDefined();
      expect(store.members.find((m) => m.id === 'delta-mem-1')).toBeDefined();
    });

    it('sets status to error when delta fetch query fails', async () => {
      (isSupabaseConfigured as jest.Mock).mockReturnValue(true);

      (supabase.from as jest.Mock).mockImplementation((table: string) => {
        if (table === 'expenses') {
          const builder: any = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            gt: jest.fn().mockReturnThis(),
            then: (resolve: any) => resolve({ data: null, error: { message: 'Network offline' } }),
          };
          return builder;
        }
        const builder: any = {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
          then: (resolve: any) => resolve({ data: [], error: null }),
        };
        return builder;
      });

      const res = await syncEngine.fetchDelta('fam_1');
      expect(res).toEqual({ updatedCount: 0 });
      expect(syncEngine.getSyncStatus()).toBe('error');
    });
  });
});
