# Real-Time Household Sync with Supabase

## Problem Statement
How might we enable multi-device real-time household expense synchronization while maintaining sub-100ms local responsiveness, zero-password onboarding, and zero ongoing cloud costs?

## Recommended Direction: Direction B (Local-First Optimistic Sync with Supabase Realtime)

1. **Zustand remains the immediate local source of truth**: Adding, updating, or deleting expenses commits instantly to local React Native state and persists to `AsyncStorage`. Users experience zero UI latency or blocking network spinners.
2. **Sync Engine (Outbox Queue)**: A lightweight background sync manager coordinates writes to Supabase. If offline, mutations remain queued locally and replay automatically when network connectivity is restored.
3. **Supabase Realtime Channels (`postgres_changes`)**: Realtime WebSocket subscriptions listen for remote changes (`INSERT`, `UPDATE`, `DELETE` across `expenses`, `categories`, and `family_members`) scoped to the active `family_id`, reconciling remote deltas smoothly into the local Zustand store.
4. **Frictionless Passwordless Onboarding**: Magic Link / Email OTP and Google OAuth via Supabase Auth. Upon first remote connection, existing local data is seamlessly migrated to the cloud database.
5. **100% Free Plan Architecture**: Built strictly within the Supabase Free Tier boundaries ($0 cost, 500 MB database, 50,000 MAU, 2 million realtime messages/mo).

## Key Assumptions to Validate
- [ ] **Background Recovery**: Mobile app backgrounding/suspension does not drop changes without recovery; waking the app triggers a fast delta fetch (`updated_at > last_sync_timestamp`).
- [ ] **Row-Level Security (RLS)**: Policies strictly confine visibility and mutations to authenticated users belonging to the same `family_id` via `auth.uid()`.
- [ ] **Idempotent Inserts**: Client-generated UUIDs prevent duplicate transaction records during offline retries or intermittent connectivity.
- [ ] **Free Tier Longevity**: Realtime message counts and storage footprints for household use remain far below free quota thresholds (<0.5% of monthly limits).

## MVP Scope
- **Free Tier Configuration**: Setup instructions and config validation for Supabase Free Tier project.
- **Authentication**: Supabase Email OTP / Magic Link modal in Settings with session persistence via `AsyncStorage`.
- **Family Pairing**: Create family or join via a short 6-character Invite Code (e.g. `FAM-8492`).
- **Realtime Two-Way Sync**: Optimistic local writes + background sync + Realtime channel subscription for `expenses`, `categories`, and `family_members`.
- **First-Run Migration**: One-tap migration flow uploading existing local data to the newly joined remote family.
- **Sync Status**: Subtle visual indicator (Synced, Syncing, Offline) in the header or settings.

## Not Doing (and Why)
- **Paid Third-Party Addons or Paid Cloud Services**: 100% zero-cost stack using Supabase Free Tier and open-source packages.
- **Complex Multi-Tenancy / Multiple Family Switching**: A user belongs to one active household; switching families adds unnecessary cognitive overhead and schema complexity.
- **Heavyweight CRDTs / Manual Merge Conflict Dialogs**: Concurrent conflicting edits on the same expense row are rare in family budgeting; Last-Write-Wins (LWW) timestamp resolution provides 99.9% correctness with 10x less complexity.
- **Custom Node / Edge Server Infrastructure**: Zero extra servers to host, deploy, or maintain. All sync runs directly between the client app and Supabase.

## Open Questions
- Should newly invited members default to `MEMBER` (can add and view all expenses) or `VIEWER` (read-only until upgraded by family admin)?
- Would you like invite codes to expire after a set time (e.g., 7 days) or remain active until regenerated?
