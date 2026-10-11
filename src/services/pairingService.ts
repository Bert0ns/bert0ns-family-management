import { supabase, isSupabaseConfigured } from '@/services/supabase';
import { useAppStore } from '@/services/store';
import { syncEngine } from '@/services/syncEngine';
import { realtimeSync } from '@/services/realtimeSync';
import { generateInviteCode, isValidUUID, generateUUID } from '@/utils/uuid';
import { syncLogger } from '@/services/logger';
import { Family } from '@/types';

export interface JoinFamilyResult {
  success: boolean;
  error?: string;
  familyId?: string;
}

export interface RegenerateCodeResult {
  success: boolean;
  code?: string;
  error?: string;
}

export interface SyncInviteCodeResult {
  code: string;
  updated: boolean;
}

export interface CreateFamilyResult {
  success: boolean;
  family?: Family;
  error?: string;
}

export interface JoinFamilyOptions {
  displayName?: string;
}

/**
 * Service encapsulating household pairing, invite codes, and family lifecycle.
 * Presentation modals (FamilyPairingModal) should delegate all data orchestration here.
 */
export const pairingService = {
  /**
   * Synchronizes remote invite code with local store, generating one if missing locally.
   */
  async syncInviteCode(
    familyId: string,
    currentInviteCode?: string,
  ): Promise<SyncInviteCodeResult> {
    // If local family doesn't have an invite code, initialize one
    let activeCode = currentInviteCode;
    if (!activeCode) {
      activeCode = generateInviteCode(6);
      useAppStore.getState().updateFamilySettings({ invite_code: activeCode });
    }

    if (!isSupabaseConfigured() || !isValidUUID(familyId)) {
      return { code: activeCode, updated: false };
    }

    try {
      const { data, error: famErr } = await supabase
        .from('families')
        .select('invite_code')
        .eq('id', familyId)
        .maybeSingle();

      if (!famErr && data?.invite_code && data.invite_code !== activeCode) {
        useAppStore.getState().updateFamilySettings({ invite_code: data.invite_code });
        return { code: data.invite_code, updated: true };
      }
    } catch (err: any) {
      syncLogger.warn('Failed to sync remote invite code', { error: err?.message });
    }

    return { code: activeCode, updated: false };
  },

  /**
   * Regenerates a household invite code in Supabase (if configured) and local state.
   */
  async regenerateInviteCode(familyId: string): Promise<RegenerateCodeResult> {
    const newCode = generateInviteCode(6);

    try {
      if (isSupabaseConfigured() && isValidUUID(familyId)) {
        const { error: updateErr } = await supabase
          .from('families')
          .update({
            invite_code: newCode,
            updated_at: new Date().toISOString(),
          })
          .eq('id', familyId);

        if (updateErr) {
          syncLogger.error('Failed to update remote invite code', { error: updateErr.message });
          return { success: false, error: updateErr.message };
        }
      }

      useAppStore.getState().updateFamilySettings({ invite_code: newCode });
      syncLogger.info('Household invite code regenerated successfully', { familyId, newCode });
      return { success: true, code: newCode };
    } catch (err: any) {
      syncLogger.error('Exception regenerating invite code', { error: err?.message });
      return { success: false, error: err?.message || 'Failed to regenerate code' };
    }
  },

  /**
   * Joins a family via invite code using the Supabase RPC or mock offline mode.
   * On success, clears outbox, resets store data, and triggers delta sync.
   */
  async joinFamilyByInviteCode(
    inviteCode: string,
    options?: JoinFamilyOptions,
  ): Promise<JoinFamilyResult> {
    const code = inviteCode.trim().toUpperCase();

    if (!isSupabaseConfigured()) {
      // Mock join for offline demonstration
      useAppStore.getState().updateFamilySettings({ name: `Household (${code})` });
      return { success: true };
    }

    try {
      // 1. Check if user is authenticated
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData?.session?.user) {
        return { success: false, error: 'AUTH_REQUIRED' };
      }

      // 2. Call RPC to join family via invite code
      const storeState = useAppStore.getState();
      const currentMember = storeState.members.find((m) => m.id === storeState.currentMemberId);
      const displayName =
        options?.displayName ||
        currentMember?.display_name ||
        sessionData.session.user.email?.split('@')[0] ||
        'New Member';

      const { data: rpcRes, error: rpcError } = await supabase.rpc('join_family_via_invite_code', {
        p_invite_code: code,
        p_display_name: displayName,
      });

      if (rpcError || !rpcRes || !rpcRes.family_id) {
        syncLogger.warn('join_family_via_invite_code RPC failed', {
          error: rpcError?.message,
          rpcRes,
        });
        return { success: false, error: rpcError?.message || 'INVALID_CODE' };
      }

      const joinedFamilyId = rpcRes.family_id as string;
      const joinedMemberId = rpcRes.member_id as string;

      syncLogger.info('User joined household successfully via invite code', {
        familyId: joinedFamilyId,
        memberId: joinedMemberId,
      });

      // 3. User is now authorized under RLS to fetch the family profile
      const { data: remoteFamily, error: findError } = await supabase
        .from('families')
        .select('*')
        .eq('id', joinedFamilyId)
        .single();

      if (findError || !remoteFamily) {
        syncLogger.error('Failed to fetch family record after joining', {
          error: findError?.message,
        });
        return { success: false, error: findError?.message || 'INVALID_CODE' };
      }

      // 4. Clear previous family outbox and sync timestamp so we do a clean delta fetch
      await syncEngine.clearOutbox();
      await syncEngine.setLastSyncTimestamp('');

      // Reset store data to avoid mixing previous local mock data with the new family
      useAppStore.setState({
        family: {
          id: remoteFamily.id,
          name: remoteFamily.name,
          currency: remoteFamily.currency || '€',
          invite_code: remoteFamily.invite_code,
          created_at: remoteFamily.created_at,
          updated_at: remoteFamily.updated_at,
        },
        members: [],
        categories: [],
        expenses: [],
        importBatches: [],
        currentMemberId: joinedMemberId || storeState.currentMemberId,
      });

      // 5. Start realtime sync and fetch remote delta
      realtimeSync.startRealtimeSync(remoteFamily.id);
      await syncEngine.fetchDelta(remoteFamily.id);

      return { success: true, familyId: joinedFamilyId };
    } catch (err: any) {
      syncLogger.error('Unexpected exception during joinFamilyByInviteCode', {
        error: err?.message,
      });
      return { success: false, error: err?.message || 'INVALID_CODE' };
    }
  },

  /**
   * Creates a new household family record.
   */
  async createFamily(name: string, currency: '€' = '€'): Promise<CreateFamilyResult> {
    try {
      const familyId = generateUUID();
      const inviteCode = generateInviteCode(6);
      const now = new Date().toISOString();

      const newFamily: Family = {
        id: familyId,
        name: name.trim(),
        currency,
        invite_code: inviteCode,
        created_at: now,
        updated_at: now,
      };

      if (isSupabaseConfigured()) {
        const { error: insertErr } = await supabase.from('families').insert({
          id: newFamily.id,
          name: newFamily.name,
          currency: newFamily.currency,
          invite_code: newFamily.invite_code,
          created_at: newFamily.created_at,
          updated_at: newFamily.updated_at,
        });

        if (insertErr) {
          syncLogger.error('Failed to insert new family in Supabase', { error: insertErr.message });
          return { success: false, error: insertErr.message };
        }
      }

      useAppStore.setState({
        family: newFamily,
      });

      return { success: true, family: newFamily };
    } catch (err: any) {
      syncLogger.error('Failed to create family', { error: err?.message });
      return { success: false, error: err?.message || 'Failed to create family' };
    }
  },
};
