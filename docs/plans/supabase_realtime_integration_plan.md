# Implementation Plan: Supabase Real-Time Household Sync

## Overview
Enable multi-device real-time synchronization of household expenses, categories, and family members using Supabase's permanent 100% Free Tier. The implementation follows **Direction B (Local-First Optimistic Sync)**: Zustand + AsyncStorage remains the instant local source of truth (<16ms response time), while a background sync engine processes an offline outbox and a Supabase Realtime channel (`postgres_changes`) pushes remote updates to all family devices in real time.

---

## Architecture Decisions

- **Local-First Optimism**: Adding, editing, and deleting expenses immediately updates the local Zustand store and persists to AsyncStorage. Users never wait on network requests.
- **Client-Side UUIDs**: Entities (`Expense`, `FamilyMember`, `Category`) use standard UUIDs generated client-side, matching Supabase's UUID primary keys without ID mapping collisions.
- **Offline Outbox & Catch-up Delta**: Mutations performed offline are enqueued in an outbox persisted to AsyncStorage. On reconnect, the outbox drains idempotently, followed by a delta fetch (`updated_at > last_sync_timestamp`).
- **Supabase Realtime (`postgres_changes`)**: A single multiplexed Realtime channel per active family listens for `INSERT`, `UPDATE`, and `DELETE` on `expenses`, `categories`, and `family_members`.
- **Passwordless Auth & 6-Char Invite Codes**: Authentication uses Supabase OTP / Magic Link or Google OAuth. Family pairing uses simple 6-character codes (e.g. `FAM-8492`), avoiding complex link handlers.
- **Strict Free Plan Compliance ($0 Cost)**: Operates 100% within the Supabase Free Tier quotas (500 MB DB, 50,000 MAU, 2M Realtime messages/mo).

---

## Dependency Graph

```
Task 1: Schema & Type Extensions (UUIDs, updated_at, invite_code)
   │
   ├── Task 2: Supabase Auth & Session Service
   │      │
   │      ├── Task 3: Sync Outbox & Delta Reconciliation Engine
   │      │      │
   │      │      ├── Task 4: Supabase Realtime Subscription Manager
   │      │      │      │
   │      │      │      └── Task 5: Initial Data Migration Service
   │      │      │             │
   │      │      │             ├── Task 6: Cloud Sync & Auth Modal in Settings
   │      │      │             │      │
   │      │      │             │      ├── Task 7: Family Invite & Pairing UI
   │      │      │             │      │      │
   │      │      │             │      │      └── Task 8: Sync Status Indicator in App Layout
```

---

## Task List

### Phase 1: Foundation & Types

#### Task 1: Schema & Type Extensions for Supabase Sync
**Description:** Update `src/data/supabase_schema.sql` and `src/types/index.ts` to include `updated_at` timestamps, family invite codes, sync status types, and UUID helper utilities. Ensure the SQL schema enables Realtime publications for `expenses`, `categories`, and `family_members`.

**Acceptance criteria:**
- [ ] `supabase_schema.sql` includes `invite_code` column with unique index on `families`, `updated_at` triggers on all synced tables, and `ALTER PUBLICATION supabase_realtime ADD TABLE ...` commands.
- [ ] `src/types/index.ts` includes `SyncStatus` ('synced' | 'syncing' | 'offline' | 'error'), `OutboxMutation`, and optional `updated_at` / `invite_code` on core models.
- [ ] UUID generation helper created in `src/utils/uuid.ts` using native crypto.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Unit test verifies UUID format and helper functions.

**Dependencies:** None  
**Files likely touched:**
- `src/data/supabase_schema.sql`
- `src/types/index.ts`
- `src/utils/uuid.ts`
- `tests/unit/uuid.test.ts`

**Estimated scope:** S (3 files)

---

#### Task 2: Supabase Auth & Session Management Service
**Description:** Implement `src/services/authService.ts` to wrap Supabase authentication: sending OTP/Magic links, verifying tokens, managing current session in AsyncStorage, and exposing an observable auth state hook/listener.

**Acceptance criteria:**
- [ ] `sendOtp(email: string)` and `verifyOtp(email: string, token: string)` implemented with error handling.
- [ ] `signOut()` properly clears local session and resets active sync listeners.
- [ ] Exposes current user and session status (`authenticated`, `unauthenticated`, `loading`).

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Unit tests for `authService.ts` with mocked Supabase client pass: `pnpm test -- tests/unit/authService.test.ts`

**Dependencies:** Task 1  
**Files likely touched:**
- `src/services/authService.ts`
- `src/services/supabase.ts`
- `tests/unit/authService.test.ts`

**Estimated scope:** S (3 files)

---

### Checkpoint: Foundation
- [ ] All unit tests pass: `pnpm test`
- [ ] Typecheck succeeds: `pnpm typecheck`
- [ ] Schema is ready to run in any Supabase dashboard SQL editor.

---

### Phase 2: Sync Engine & Realtime

#### Task 3: Sync Outbox & Delta Reconciliation Engine
**Description:** Build `src/services/syncEngine.ts` to handle two-way data sync: enqueuing mutations locally when offline, flushing mutations to Supabase when online, and reconciling remote deltas (`updated_at > last_sync`) using Last-Write-Wins.

**Acceptance criteria:**
- [ ] Offline mutations (`INSERT`, `UPDATE`, `DELETE` on expenses/categories/members) are enqueued in an outbox persisted to AsyncStorage.
- [ ] `flushOutbox()` sends mutations to Supabase and clears processed items.
- [ ] `fetchDelta(familyId: string, since: string)` pulls changed records and updates local Zustand store without overwriting newer local edits.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Unit tests for outbox queuing, flushing, and LWW resolution pass: `pnpm test -- tests/unit/syncEngine.test.ts`

**Dependencies:** Task 1, Task 2  
**Files likely touched:**
- `src/services/syncEngine.ts`
- `src/services/store.ts`
- `tests/unit/syncEngine.test.ts`

**Estimated scope:** M (3 files)

---

#### Task 4: Supabase Realtime Subscription Manager
**Description:** Implement `src/services/realtimeSync.ts` to subscribe to Supabase Realtime channels (`postgres_changes`) for the active `family_id`. On incoming events from other household devices, update the Zustand store in real time.

**Acceptance criteria:**
- [ ] Subscribes to `public:expenses`, `public:categories`, and `public:family_members` filtered by `family_id=eq.${familyId}`.
- [ ] Handles `INSERT`, `UPDATE`, and `DELETE` payloads by dispatching corresponding actions into `useAppStore`.
- [ ] Handles channel disconnection, reconnection, and re-triggers delta fetch on reconnect to catch missed events.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Unit tests for payload dispatching pass: `pnpm test -- tests/unit/realtimeSync.test.ts`

**Dependencies:** Task 3  
**Files likely touched:**
- `src/services/realtimeSync.ts`
- `src/services/store.ts`
- `tests/unit/realtimeSync.test.ts`

**Estimated scope:** M (3 files)

---

#### Task 5: Initial Data Migration Service
**Description:** Create `src/services/migrationService.ts` to facilitate first-run cloud onboarding: prompts or automatically uploads existing local expenses, categories, and members into the newly connected Supabase family database.

**Acceptance criteria:**
- [ ] Detects whether local store contains non-synced data when connecting to a family.
- [ ] Performs atomic batch insert of categories, members, and expenses into Supabase.
- [ ] Sets initial `last_sync_timestamp` and marks store as synced.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Unit tests for migration payload transformation pass: `pnpm test -- tests/unit/migrationService.test.ts`

**Dependencies:** Task 3, Task 4  
**Files likely touched:**
- `src/services/migrationService.ts`
- `tests/unit/migrationService.test.ts`

**Estimated scope:** S (2 files)

---

### Checkpoint: Core Sync
- [ ] All unit tests pass: `pnpm test`
- [ ] Outbox, delta sync, realtime dispatch, and migration logic verified.
- [ ] `pnpm typecheck` passes with 0 errors.

---

### Phase 3: UI Integration & Family Pairing

#### Task 6: Cloud Sync & Auth Modal in Settings
**Description:** Enhance `src/app/(tabs)/settings.tsx` and create `src/components/sync/AuthModal.tsx` to allow users to sign in with email OTP/Magic Link, view their connection status, and log out.

**Acceptance criteria:**
- [ ] Settings screen "Cloud Sync" card shows current auth state (Logged in as email / Offline Local-Only).
- [ ] Clean Apple glassmorphic modal for entering email and 6-digit OTP token.
- [ ] Displays helpful errors (invalid code, network timeout) with friendly i18n text.

**Verification:**
- [ ] Visual check on web/mobile.
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Format check passes: `pnpm format:check`

**Dependencies:** Task 2, Task 5  
**Files likely touched:**
- `src/components/sync/AuthModal.tsx`
- `src/app/(tabs)/settings.tsx`
- `src/i18n/en.ts`
- `src/i18n/it.ts`

**Estimated scope:** M (4 files)

---

#### Task 7: Family Invite & Pairing UI
**Description:** Implement `src/components/sync/FamilyPairingModal.tsx` allowing the user to either create a new cloud family (generating a 6-character code like `FAM-8492`) or join an existing family by entering their partner's code.

**Acceptance criteria:**
- [ ] Modal displays household code with a one-tap copy button.
- [ ] Input field to enter an existing invite code and join household.
- [ ] Upon joining, triggers Task 5 migration / delta sync.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] Component renders cleanly in light and dark modes.

**Dependencies:** Task 5, Task 6  
**Files likely touched:**
- `src/components/sync/FamilyPairingModal.tsx`
- `src/app/(tabs)/family.tsx`
- `src/i18n/en.ts`
- `src/i18n/it.ts`

**Estimated scope:** M (4 files)

---

#### Task 8: Sync Status Indicator in App Layout
**Description:** Add a subtle, non-intrusive sync badge (`src/components/common/SyncBadge.tsx`) in the header of the app displaying live status (Synced, Syncing, Offline) with real-time feedback.

**Acceptance criteria:**
- [ ] Displays minimal icon (CloudCheck when synced, CloudOff when offline, animated spin when syncing).
- [ ] Tapping the badge opens a quick status sheet with last sync time and a manual "Sync Now" button.
- [ ] Integrated seamlessly into the top header of `src/app/(tabs)/_layout.tsx` or screen headers.

**Verification:**
- [ ] TypeScript check passes: `pnpm typecheck`
- [ ] `pnpm test` passes all suites.
- [ ] Verified on Web layout.

**Dependencies:** Task 4, Task 7  
**Files likely touched:**
- `src/components/common/SyncBadge.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/i18n/en.ts`
- `src/i18n/it.ts`

**Estimated scope:** S (4 files)

---

### Checkpoint: Complete Verification
- [ ] Full test suite passes: `pnpm test`
- [ ] Type check passes: `pnpm typecheck`
- [ ] Prettier lint/format passes: `pnpm format:check`
- [ ] End-to-end flow verified: Sign in -> Create/Join family -> Log expense -> Live broadcast received.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **Supabase Free Project Pausing after 7 days inactivity** | Low | App checks configuration and catches 503/paused error, showing a friendly prompt: "Tap here to unpause your free household database". |
| **Simultaneous offline edits on same expense** | Low | Last-Write-Wins (LWW) using `updated_at` timestamp. Expense splits are calculated deterministically. |
| **Offline insert duplicates on reconnection** | Medium | Client-generated UUIDs ensure idempotency on `INSERT ... ON CONFLICT (id) DO NOTHING / UPDATE`. |
| **Network transitions dropping WebSocket** | Medium | Auto-reconnection listener in `realtimeSync.ts` automatically runs `fetchDelta()` upon socket reconnect to fill any gaps. |

---

## Open Questions
- Default role for invited family members: automatically make them full `MEMBER` (able to add, edit, and view expenses)? *(Recommended: Yes, frictionless for spouses/partners)*.
- Should we provide sample environment variable file (`.env.example`) with dummy values for easy setup? *(Recommended: Yes)*.
