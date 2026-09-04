import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';
import { useAppStore } from './store';
import { syncEngine } from './syncEngine';
import { generateUUID, isValidUUID } from '@/utils/uuid';
import { Expense, Category, FamilyMember, ExpenseSplit } from '@/types';

export const migrationService = {
  async migrateLocalDataToSupabase(
    familyId: string,
    userId?: string,
  ): Promise<{
    success: boolean;
    expensesCount: number;
    categoriesCount: number;
    membersCount: number;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        expensesCount: 0,
        categoriesCount: 0,
        membersCount: 0,
        error: 'Supabase is not configured',
      };
    }

    try {
      supabaseLogger.info('Starting local data migration to Supabase', { familyId, userId });

      const store = useAppStore.getState();
      const localFamily = store.family;
      const localMembers = store.members;
      const localCategories = store.categories;
      const localExpenses = store.expenses;

      // 1. Deterministic ID mapping for legacy non-UUID IDs (e.g. cat_groceries, mem_1, exp_...)
      const idMap = new Map<string, string>();
      const toUUID = (id: string): string => {
        if (isValidUUID(id)) return id;
        if (!idMap.has(id)) {
          idMap.set(id, generateUUID());
        }
        return idMap.get(id)!;
      };

      const now = new Date().toISOString();

      // 2. Prepare and upsert Family record
      const targetFamilyId = isValidUUID(familyId) ? familyId : toUUID(familyId);
      const { error: famError } = await supabase.from('families').upsert({
        id: targetFamilyId,
        name: localFamily.name,
        currency: '€',
        updated_at: now,
      });
      if (famError) throw famError;

      // 3. Prepare and upsert Categories
      const mappedCategories: Category[] = localCategories.map((c) => ({
        ...c,
        id: toUUID(c.id),
        family_id: targetFamilyId,
        updated_at: now,
      }));

      const { error: catError } = await supabase.from('categories').upsert(
        mappedCategories.map((c) => ({
          id: c.id,
          family_id: c.family_id,
          name: c.name,
          icon: c.icon,
          color: c.color,
          is_default: Boolean(c.is_default),
          updated_at: now,
        })),
      );
      if (catError) throw catError;

      // 4. Prepare and upsert Members
      const mappedMembers: FamilyMember[] = localMembers.map((m) => {
        const isCurrent = m.id === store.currentMemberId;
        return {
          ...m,
          id: toUUID(m.id),
          family_id: targetFamilyId,
          user_id: isCurrent && userId ? userId : m.user_id,
          updated_at: now,
        };
      });

      const { error: memError } = await supabase.from('family_members').upsert(
        mappedMembers.map((m) => ({
          id: m.id,
          family_id: m.family_id,
          user_id: m.user_id || null,
          display_name: m.display_name,
          role: m.role,
          avatar_url: m.avatar_url || null,
          color_code: m.color_code,
          updated_at: now,
        })),
      );
      if (memError) throw memError;

      // 5. Prepare and upsert Expenses and Splits
      const mappedExpenses: Expense[] = [];
      const splitsPayload: any[] = [];

      localExpenses.forEach((e) => {
        const newExpId = toUUID(e.id);
        const mappedPaidBy = toUUID(e.paid_by_member_id);
        const mappedCategory = toUUID(e.category_id);

        let mappedSplits: ExpenseSplit[] | undefined = undefined;
        if (e.splits && e.splits.length > 0) {
          mappedSplits = e.splits.map((s) => {
            const splitId = generateUUID();
            const splitMemberId = toUUID(s.member_id);
            splitsPayload.push({
              id: splitId,
              expense_id: newExpId,
              member_id: splitMemberId,
              share_amount: s.share_amount,
              percentage: s.percentage ?? null,
              updated_at: now,
            });
            return {
              member_id: splitMemberId,
              share_amount: s.share_amount,
              percentage: s.percentage,
            };
          });
        }

        mappedExpenses.push({
          ...e,
          id: newExpId,
          family_id: targetFamilyId,
          paid_by_member_id: mappedPaidBy,
          category_id: mappedCategory,
          splits: mappedSplits,
          updated_at: now,
        });
      });

      if (mappedExpenses.length > 0) {
        const { error: expError } = await supabase.from('expenses').upsert(
          mappedExpenses.map((e) => ({
            id: e.id,
            family_id: e.family_id,
            paid_by_member_id: e.paid_by_member_id,
            category_id: e.category_id,
            import_batch_id: null,
            transaction_date: e.transaction_date,
            merchant_name: e.merchant_name,
            amount: e.amount,
            notes: e.notes || null,
            payment_method: e.payment_method || null,
            is_recurring: Boolean(e.is_recurring),
            is_verified: Boolean(e.is_verified),
            created_at: e.created_at,
            updated_at: now,
          })),
        );
        if (expError) throw expError;

        if (splitsPayload.length > 0) {
          const { error: splitError } = await supabase.from('expense_splits').upsert(splitsPayload);
          if (splitError) throw splitError;
        }
      }

      // 6. Update local store state with the mapped UUID entities
      const newCurrentMemberId = toUUID(store.currentMemberId);
      useAppStore.setState({
        family: { ...localFamily, id: targetFamilyId, updated_at: now },
        members: mappedMembers,
        categories: mappedCategories,
        expenses: mappedExpenses,
        currentMemberId: newCurrentMemberId,
      });

      await syncEngine.setLastSyncTimestamp(now);
      await syncEngine.clearOutbox();

      supabaseLogger.info('Migration to Supabase succeeded', {
        expensesCount: mappedExpenses.length,
        categoriesCount: mappedCategories.length,
        membersCount: mappedMembers.length,
      });

      return {
        success: true,
        expensesCount: mappedExpenses.length,
        categoriesCount: mappedCategories.length,
        membersCount: mappedMembers.length,
      };
    } catch (err: any) {
      supabaseLogger.error('Data migration to Supabase failed', { error: err });
      return {
        success: false,
        expensesCount: 0,
        categoriesCount: 0,
        membersCount: 0,
        error: err?.message || 'Migration failed',
      };
    }
  },
};
