import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';
import { useAppStore } from './store';
import { syncEngine } from './syncEngine';
import { generateUUID, isValidUUID, generateInviteCode } from '@/utils/uuid';
import { Expense, Category, FamilyMember, ImportBatch } from '@/types';

export const migrationService = {
  async migrateLocalDataToSupabase(
    familyId: string,
    userId?: string,
  ): Promise<{
    success: boolean;
    targetFamilyId?: string;
    expensesCount: number;
    categoriesCount: number;
    membersCount: number;
    batchesCount?: number;
    error?: string;
  }> {
    if (!isSupabaseConfigured()) {
      return {
        success: false,
        expensesCount: 0,
        categoriesCount: 0,
        membersCount: 0,
        batchesCount: 0,
        error: 'Supabase is not configured',
      };
    }

    let targetFamilyId: string | null = null;
    let createdFamily = false;

    try {
      supabaseLogger.info('Starting local data migration to Supabase', { familyId, userId });

      const store = useAppStore.getState();
      const localFamily = store.family;
      const localMembers = store.members;
      const localCategories = store.categories;
      const localExpenses = store.expenses;
      const localBatches = store.importBatches;

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
      targetFamilyId = isValidUUID(familyId) ? familyId : toUUID(familyId);
      const targetInviteCode = localFamily.invite_code || generateInviteCode(6);
      const { error: famError } = await supabase.from('families').upsert({
        id: targetFamilyId,
        name: localFamily.name,
        currency: localFamily.currency || '€',
        invite_code: targetInviteCode,
        updated_at: now,
      });
      if (famError) throw famError;
      createdFamily = true;

      // 3. Prepare and upsert Members FIRST so that is_member_of_family(targetFamilyId) passes for categories & expenses
      const mappedMembers: FamilyMember[] = localMembers.map((m) => {
        const isCurrent = m.id === store.currentMemberId;
        return {
          ...m,
          id: toUUID(m.id),
          family_id: targetFamilyId!,
          user_id: isCurrent && userId ? userId : m.user_id,
          updated_at: now,
        };
      });

      // Upsert current user member first so that RLS is_member_of_family is satisfied
      const currentUserMember = mappedMembers.find((m) => m.user_id === userId);
      if (currentUserMember) {
        const { error: currMemErr } = await supabase.from('family_members').upsert({
          id: currentUserMember.id,
          family_id: currentUserMember.family_id,
          user_id: currentUserMember.user_id,
          display_name: currentUserMember.display_name,
          role: currentUserMember.role,
          avatar_url: currentUserMember.avatar_url || null,
          color_code: currentUserMember.color_code,
          updated_at: now,
        });
        if (currMemErr) throw currMemErr;
      }

      // Upsert remaining members
      const remainingMembers = mappedMembers.filter((m) => m.id !== currentUserMember?.id);
      if (remainingMembers.length > 0) {
        const { error: remMemErr } = await supabase.from('family_members').upsert(
          remainingMembers.map((m) => ({
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
        if (remMemErr) throw remMemErr;
      }

      // 4. Prepare and upsert Categories
      const mappedCategories: Category[] = localCategories.map((c) => ({
        ...c,
        id: toUUID(c.id),
        family_id: targetFamilyId!,
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

      // 5. Prepare and upsert Import Batches BEFORE expenses to satisfy foreign key constraints
      const mappedBatches: ImportBatch[] = localBatches.map((b) => ({
        ...b,
        id: toUUID(b.id),
        family_id: targetFamilyId!,
        imported_by_member_id: toUUID(b.imported_by_member_id),
        created_at: b.created_at || now,
        updated_at: now,
      }));

      if (mappedBatches.length > 0) {
        const { error: batchError } = await supabase.from('import_batches').upsert(
          mappedBatches.map((b) => ({
            id: b.id,
            family_id: b.family_id,
            imported_by_member_id: b.imported_by_member_id,
            file_name: b.file_name,
            total_records: b.total_records,
            total_amount: b.total_amount,
            raw_payload: b.raw_payload ?? null,
            created_at: b.created_at,
            updated_at: now,
          })),
        );
        if (batchError) throw batchError;
      }

      // 6. Prepare and upsert Expenses
      const mappedExpenses: Expense[] = localExpenses.map((e) => ({
        ...e,
        id: toUUID(e.id),
        family_id: targetFamilyId!,
        paid_by_member_id: toUUID(e.paid_by_member_id),
        category_id: toUUID(e.category_id),
        import_batch_id: e.import_batch_id ? toUUID(e.import_batch_id) : undefined,
        updated_at: now,
      }));

      if (mappedExpenses.length > 0) {
        const { error: expError } = await supabase.from('expenses').upsert(
          mappedExpenses.map((e) => ({
            id: e.id,
            family_id: e.family_id,
            paid_by_member_id: e.paid_by_member_id,
            category_id: e.category_id,
            import_batch_id: e.import_batch_id || null,
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
      }

      // 7. Update local store state with the mapped UUID entities
      const newCurrentMemberId = toUUID(store.currentMemberId);
      useAppStore.setState({
        family: {
          ...localFamily,
          id: targetFamilyId,
          invite_code: targetInviteCode,
          updated_at: now,
        },
        members: mappedMembers,
        categories: mappedCategories,
        expenses: mappedExpenses,
        importBatches: mappedBatches,
        currentMemberId: newCurrentMemberId,
      });

      await syncEngine.setLastSyncTimestamp(now);
      await syncEngine.clearOutbox();

      supabaseLogger.info('Migration to Supabase succeeded', {
        targetFamilyId,
        expensesCount: mappedExpenses.length,
        categoriesCount: mappedCategories.length,
        membersCount: mappedMembers.length,
        batchesCount: mappedBatches.length,
      });

      return {
        success: true,
        targetFamilyId,
        expensesCount: mappedExpenses.length,
        categoriesCount: mappedCategories.length,
        membersCount: mappedMembers.length,
        batchesCount: mappedBatches.length,
      };
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : typeof err === 'object' && err !== null && 'message' in err
            ? String((err as { message: unknown }).message)
            : String(err);

      supabaseLogger.error('Failed to migrate local data to Supabase', {
        error: errorMessage,
      });

      // Compensation rollback: if migration failed mid-way, attempt to clean up the partially created target family
      if (createdFamily && targetFamilyId) {
        try {
          await supabase.from('families').delete().eq('id', targetFamilyId);
          supabaseLogger.info(
            'Rolled back partially created family record after migration failure',
            {
              targetFamilyId,
            },
          );
        } catch (cleanupErr) {
          supabaseLogger.warn('Failed to rollback partially created family record', {
            targetFamilyId,
            cleanupErr,
          });
        }
      }

      return {
        success: false,
        expensesCount: 0,
        categoriesCount: 0,
        membersCount: 0,
        batchesCount: 0,
        error: errorMessage || 'Unknown migration failure',
      };
    }
  },
};
