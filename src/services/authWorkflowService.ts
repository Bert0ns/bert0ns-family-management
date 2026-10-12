import { User } from '@supabase/supabase-js';
import { authService } from './authService';
import { migrationService } from './migrationService';
import { realtimeSync } from './realtimeSync';
import { syncEngine } from './syncEngine';
import { useAppStore } from './store';
import { authLogger, syncLogger } from './logger';

export interface VerifyAndMigrateResult {
  success: boolean;
  targetFamilyId?: string;
  user?: User | null;
  error?: string;
}

export const authWorkflowService = {
  /**
   * Dispatches OTP login code to the specified email address.
   */
  async sendOtp(email: string, redirectTo?: string): Promise<{ error: string | null }> {
    return authService.sendOtp(email, redirectTo);
  },

  /**
   * Verifies the OTP, executes local data migration to Supabase,
   * rolls back state and signs out on failure, and initializes realtime sync on success.
   */
  async verifyOtpAndMigrate(
    email: string,
    otp: string,
    familyId: string,
  ): Promise<VerifyAndMigrateResult> {
    authLogger.info('Starting auth verification & migration workflow', { email, familyId });

    // 1. Verify OTP
    const verifyRes = await authService.verifyOtp(email, otp);
    if (verifyRes.error || !verifyRes.session) {
      authLogger.warn('OTP verification failed in auth workflow', { error: verifyRes.error });
      return { success: false, error: verifyRes.error || 'OTP verification failed' };
    }

    const userId = verifyRes.session.user?.id;
    const user = verifyRes.session.user;

    // 2. Snapshot store state before migration for atomic rollback
    const storeState = useAppStore.getState();
    const snapshot = {
      family: { ...storeState.family },
      members: [...storeState.members],
      categories: [...storeState.categories],
      expenses: [...storeState.expenses],
      importBatches: [...storeState.importBatches],
      currentMemberId: storeState.currentMemberId,
    };

    // 3. Run cloud migration
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

      // 4. Initialize realtime sync and fetch initial delta
      const activeFamilyId = migrationRes.targetFamilyId || useAppStore.getState().family.id;
      realtimeSync.startRealtimeSync(activeFamilyId);
      await syncEngine.fetchDelta(activeFamilyId);

      syncLogger.info('Auth workflow completed successfully', { activeFamilyId });
      return { success: true, targetFamilyId: activeFamilyId, user };
    } catch (err: any) {
      authLogger.error('Unexpected exception during auth workflow migration, rolling back', {
        error: err?.message,
      });

      // Rollback store state
      useAppStore.setState(snapshot);

      // Sign out
      await authService.signOut();

      return {
        success: false,
        error: err?.message || 'Unexpected migration failure',
      };
    }
  },
};
