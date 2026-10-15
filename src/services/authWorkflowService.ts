import { User } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { authService } from './authService';
import { migrationService } from './migrationService';
import { realtimeSync } from './realtimeSync';
import { syncEngine } from './syncEngine';
import { useAppStore } from './store';
import { authLogger, syncLogger } from './logger';

export type AuthIntent = 'create' | 'join';

export interface VerifyOtpAndMigrateOptions {
  intent?: AuthIntent;
}

export interface VerifyAndMigrateResult {
  success: boolean;
  targetFamilyId?: string;
  user?: User | null;
  error?: string;
  actionTaken?: 'migrated' | 'hydrated_existing' | 'ready_to_join';
}

export const authWorkflowService = {
  /**
   * Queries Supabase to see if the user's auth.uid() is already registered in family_members.
   * SELECT family_id, id FROM public.family_members WHERE user_id = auth.uid() AND deleted_at IS NULL LIMIT 1
   */
  async checkExistingFamilyMembership(
    userId: string,
  ): Promise<{ family_id: string; id: string } | null> {
    if (!isSupabaseConfigured() || !userId) {
      return null;
    }
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('family_id, id')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .limit(1)
        .maybeSingle();

      if (error) {
        authLogger.warn('Error querying family membership for user', {
          userId,
          error: error.message,
        });
        return null;
      }
      return data || null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      authLogger.warn('Exception querying family membership for user', {
        userId,
        error: message,
      });
      return null;
    }
  },

  /**
   * Dispatches OTP login code to the specified email address.
   */
  async sendOtp(email: string, redirectTo?: string): Promise<{ error: string | null }> {
    return authService.sendOtp(email, redirectTo);
  },

  /**
   * Verifies the OTP, executes the post-authentication resolver to detect existing cloud family
   * or invite-join intent, migrates local data when appropriate, and initializes realtime sync.
   */
  async verifyOtpAndMigrate(
    email: string,
    otp: string,
    familyId: string,
    options?: VerifyOtpAndMigrateOptions | AuthIntent,
  ): Promise<VerifyAndMigrateResult> {
    const intent: AuthIntent | undefined = typeof options === 'string' ? options : options?.intent;

    authLogger.info('Starting auth verification & post-auth workflow', {
      email,
      familyId,
      intent,
    });

    // 1. Verify OTP
    const verifyRes = await authService.verifyOtp(email, otp);
    if (verifyRes.error || !verifyRes.session) {
      authLogger.warn('OTP verification failed in auth workflow', { error: verifyRes.error });
      return { success: false, error: verifyRes.error || 'OTP verification failed' };
    }

    const userId = verifyRes.session.user?.id;
    const user = verifyRes.session.user;

    if (!userId) {
      authLogger.warn('Session user ID missing after OTP verification');
      return { success: false, error: 'User ID missing in verified session' };
    }

    // 2. Snapshot store state before any operations for atomic rollback
    const storeState = useAppStore.getState();
    const snapshot = {
      family: { ...storeState.family },
      members: [...storeState.members],
      categories: [...storeState.categories],
      expenses: [...storeState.expenses],
      importBatches: [...storeState.importBatches],
      currentMemberId: storeState.currentMemberId,
    };

    // 3. Post-authentication resolver: check if user already belongs to a family in Supabase
    const existingMembership = await this.checkExistingFamilyMembership(userId);

    // Scenario A: Family membership already exists (multi-device login / 2nd device)
    if (existingMembership) {
      const existingFamilyId = existingMembership.family_id;
      const memberId = existingMembership.id;

      authLogger.info('Existing cloud family membership resolved; hydrating remote state', {
        userId,
        familyId: existingFamilyId,
        memberId,
      });

      // Clear local outbox and lastSyncTimestamp to prevent obsolete demo data push
      await syncEngine.clearOutbox();
      await syncEngine.setLastSyncTimestamp('');

      // Set family ID and clear obsolete local demo data
      const currentStore = useAppStore.getState();
      useAppStore.setState({
        family: {
          ...currentStore.family,
          id: existingFamilyId,
        },
        members: [],
        categories: [],
        expenses: [],
        importBatches: [],
        currentMemberId: memberId || currentStore.currentMemberId,
      });

      // Hydrate store via syncEngine.fetchDelta(familyId) and start realtimeSync.startRealtimeSync(familyId)
      try {
        await syncEngine.fetchDelta(existingFamilyId);
        realtimeSync.startRealtimeSync(existingFamilyId);

        syncLogger.info('Multi-device login cloud hydration completed successfully', {
          familyId: existingFamilyId,
        });

        return {
          success: true,
          targetFamilyId: existingFamilyId,
          user,
          actionTaken: 'hydrated_existing',
        };
      } catch (hydrateErr: unknown) {
        const message = hydrateErr instanceof Error ? hydrateErr.message : String(hydrateErr);
        authLogger.error('Failed to hydrate store from existing cloud family delta, rolling back', {
          familyId: existingFamilyId,
          error: message,
        });

        useAppStore.setState(snapshot);
        await authService.signOut();

        return {
          success: false,
          error: message || 'Failed to sync existing cloud data',
        };
      }
    }

    // Scenario B: No family membership exists and user logged in with intent to join via invite code
    if (intent === 'join') {
      authLogger.info(
        'No family membership found and user intent is to join via invite code; skipping migration',
        { userId },
      );
      return {
        success: true,
        user,
        actionTaken: 'ready_to_join',
      };
    }

    // Scenario C: No family membership exists and user is creating/syncing their first cloud family
    try {
      const migrationRes = await migrationService.migrateLocalDataToSupabase(familyId, userId);

      if (!migrationRes.success) {
        authLogger.error('Cloud migration failed during auth workflow, initiating rollback', {
          error: migrationRes.error,
        });

        // Rollback local store to previous snapshot
        useAppStore.setState(snapshot);

        // Sign out to prevent orphaned half-authenticated state
        await authService.signOut();

        return {
          success: false,
          error: migrationRes.error || 'Migration failed',
        };
      }

      // Initialize realtime sync and fetch initial delta
      const activeFamilyId = migrationRes.targetFamilyId || useAppStore.getState().family.id;
      realtimeSync.startRealtimeSync(activeFamilyId);
      await syncEngine.fetchDelta(activeFamilyId);

      syncLogger.info('Auth workflow completed successfully', { activeFamilyId });
      return {
        success: true,
        targetFamilyId: activeFamilyId,
        user,
        actionTaken: 'migrated',
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      authLogger.error('Unexpected exception during auth workflow migration, rolling back', {
        error: message,
      });

      // Rollback store state
      useAppStore.setState(snapshot);

      // Sign out
      await authService.signOut();

      return {
        success: false,
        error: message || 'Unexpected migration failure',
      };
    }
  },
};
