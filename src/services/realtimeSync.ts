import { RealtimeChannel } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './supabase';
import { supabaseLogger } from './logger';
import { useAppStore } from './store';
import { syncEngine } from './syncEngine';
import { Expense, Category, FamilyMember, Settlement, AppNotification } from '@/types';

let activeChannel: RealtimeChannel | null = null;
let currentSubscribedFamilyId: string | null = null;

export const realtimeSync = {
  isRealtimeActive(): boolean {
    return activeChannel !== null;
  },

  getCurrentFamilyId(): string | null {
    return currentSubscribedFamilyId;
  },

  startRealtimeSync(familyId: string): void {
    if (!isSupabaseConfigured() || !familyId) {
      supabaseLogger.debug('Supabase not configured or invalid familyId; realtime sync skipped');
      return;
    }

    if (activeChannel && currentSubscribedFamilyId === familyId) {
      return; // Already subscribed to this family
    }

    this.stopRealtimeSync();

    currentSubscribedFamilyId = familyId;
    supabaseLogger.info('Starting Supabase Realtime sync for family', { familyId });

    const channelName = `family_realtime_${familyId}`;
    const channel = supabase.channel(channelName);

    // 1. Expenses channel listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'expenses',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        supabaseLogger.info('Realtime expense event received', {
          eventType: payload.eventType,
        });

        const store = useAppStore.getState();

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const raw = payload.new as any;
          const mapped: Expense = {
            id: raw.id,
            family_id: raw.family_id,
            paid_by_member_id: raw.paid_by_member_id,
            category_id: raw.category_id,
            import_batch_id: raw.import_batch_id,
            transaction_date: raw.transaction_date,
            merchant_name: raw.merchant_name,
            amount: Number(raw.amount),
            notes: raw.notes,
            payment_method: raw.payment_method,
            is_recurring: raw.is_recurring,
            is_verified: raw.is_verified,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
          };
          store.reconcileRemoteExpenses([mapped]);
        } else if (payload.eventType === 'DELETE') {
          const oldRecord = payload.old as any;
          if (oldRecord?.id) {
            store.removeRemoteExpense(oldRecord.id);
          }
        }
      },
    );

    // 2. Categories channel listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'categories',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        supabaseLogger.info('Realtime category event received', {
          eventType: payload.eventType,
        });

        const store = useAppStore.getState();

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const raw = payload.new as any;
          const mapped: Category = {
            id: raw.id,
            family_id: raw.family_id,
            name: raw.name,
            icon: raw.icon,
            color: raw.color,
            is_default: raw.is_default,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
          };
          store.reconcileRemoteCategories([mapped]);
        } else if (payload.eventType === 'DELETE') {
          const oldRecord = payload.old as any;
          if (oldRecord?.id) {
            store.removeRemoteCategory(oldRecord.id);
          }
        }
      },
    );

    // 3. Family Members channel listener
    channel.on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'family_members',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        supabaseLogger.info('Realtime member event received', {
          eventType: payload.eventType,
        });

        const store = useAppStore.getState();

        if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
          const raw = payload.new as any;
          const mapped: FamilyMember = {
            id: raw.id,
            family_id: raw.family_id,
            user_id: raw.user_id,
            display_name: raw.display_name,
            role: raw.role,
            avatar_url: raw.avatar_url,
            color_code: raw.color_code,
            created_at: raw.created_at,
            updated_at: raw.updated_at,
          };
          store.reconcileRemoteMembers([mapped]);
        } else if (payload.eventType === 'DELETE') {
          const oldRecord = payload.old as any;
          if (oldRecord?.id) {
            store.removeRemoteMember(oldRecord.id);
          }
        }
      },
    );

    // 4. Settlements channel listener
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'settlements',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        supabaseLogger.info('Realtime settlement event received');
        const raw = payload.new as any;
        const mapped: Settlement = {
          id: raw.id,
          family_id: raw.family_id,
          from_member_id: raw.from_member_id,
          to_member_id: raw.to_member_id,
          amount: Number(raw.amount),
          notes: raw.notes,
          created_at: raw.created_at,
        };
        useAppStore.getState().reconcileRemoteSettlements([mapped]);
      },
    );

    // 5. In-App Notifications channel listener
    channel.on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `family_id=eq.${familyId}`,
      },
      (payload) => {
        const raw = payload.new as any;
        const store = useAppStore.getState();
        // Only deliver if directed to this member
        if (raw.recipient_member_id === store.currentMemberId) {
          supabaseLogger.info('Realtime notification received for current member', {
            type: raw.type,
          });
          const mapped: AppNotification = {
            id: raw.id,
            family_id: raw.family_id,
            recipient_member_id: raw.recipient_member_id,
            actor_member_id: raw.actor_member_id,
            type: raw.type,
            title: raw.title,
            body: raw.body,
            data: raw.data,
            is_read: raw.is_read || false,
            created_at: raw.created_at,
          };
          store.addNotification(mapped);
        }
      },
    );

    // Subscribe to channel status
    channel.subscribe((status) => {
      supabaseLogger.info('Realtime subscription status update', { status });
      if (status === 'SUBSCRIBED') {
        // Run catch-up delta sync in case anything was missed
        syncEngine.fetchDelta(familyId).catch((err: unknown) => {
          supabaseLogger.debug('Catch-up delta error', { error: err });
        });
      }
    });

    activeChannel = channel;
  },

  stopRealtimeSync(): void {
    if (activeChannel) {
      supabaseLogger.info('Stopping Supabase Realtime sync');
      supabase.removeChannel(activeChannel);
      activeChannel = null;
      currentSubscribedFamilyId = null;
    }
  },
};
