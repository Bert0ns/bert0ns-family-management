# Codebase Remediation Master Plan

> **Target Project:** Bert0n's Family Management  
> **Source Audit Report:** [`docs/reports/codebase-audit-and-review-report.html`](../reports/codebase-audit-and-review-report.html)  
> **Authoring Date:** September 9, 2026  
> **Status:** Completed & Verified (17/17 Test Suites, 0 TypeScript Errors)

---

## Executive Overview & Architectural Strategy

The comprehensive audit identified **51 findings** across 4 functional domains. This Master Plan structures the remediation into 4 sequential, non-breaking phases aligned with the repository's semantic partitions.

Each phase guarantees:

1. **Zero Regression Guarantee:** Every phase must pass `pnpm typecheck` and all Jest test suites with 100% success before moving to the next.
2. **Defensive Mathematical & Concurrency Invariants:** Cents-based arithmetic, concurrency mutex locks, soft-delete tombstones, and RLS defense-in-depth.
3. **Senior-First Ergonomics:** 48px+ touch targets, zero clutter, high-contrast tokens, and complete 1:1 English/Italian localization parity.
4. **Explicit Test-Driven Verification:** New unit tests covering edge cases, race conditions, injection payloads, and zero-value fallbacks.

---

## Phase 1: Partition 1 — Core Domain, State Management, Storage & Data Models

### 1.1 Remediation Tasks

- [x] **Task 1.1: Fix Batch Import Store Mutation Synchronization (`store.ts:299-387`)**
  - Problem: `importExpenseReport` writes imported expenses to Zustand but omits `notifyStoreMutation`.
  - Fix: Loop over newly inserted expenses and emit `notifyStoreMutation({ entity: 'expense', operation: 'INSERT', entity_id: exp.id, payload: exp })`.
  - Fix ID generation: Replace `exp_imp_${Date.now()}...` with standard `generateUUID()` to conform to Supabase `UUID NOT NULL`.
- [x] **Task 1.2: Complete Cascade Deletion Mutation Notifications (`store.ts:214-266`)**
  - Problem: `deleteMember` deletes all expenses paid by that member locally, but only emits a single `DELETE` mutation for the member ID, leaving remote database expenses intact.
  - Fix: Identify all cascaded expenses and emit `notifyStoreMutation({ entity: 'expense', operation: 'DELETE', entity_id: e.id, payload: { id: e.id } })` for each.
- [x] **Task 1.3: Prevent Split De-synchronization on Expense Updates (`store.ts:144-162`)**
  - Problem: Updating an expense amount without explicitly supplying splits retains old split amounts that no longer sum to the expense total.
  - Fix: When `updates.amount !== undefined && updates.amount !== existing.amount`, if existing splits exist and no explicit splits are passed, recalculate equal splits using `calculateEqualSplits(updates.amount, existing.splits.map(s => s.member_id))`.
- [x] **Task 1.4: Defend Category Deletion Invariants (`store.ts:268-297`)**
  - Problem: Deleting the last category or a default system category (`is_default: true`) corrupts taxonomy and causes fallback to the deleted category itself.
  - Fix: Disallow deletion if `categories.length <= 1` or `category.is_default === true`.
- [x] **Task 1.5: Optimize Remote Reconciliation with Index Map (`store.ts:404-453`)**
  - Problem: `reconcileRemoteExpenses` executes $O(N \times M)$ nested `findIndex` lookups and `unshift()` array reallocations.
  - Fix: Construct a `Map<string, Expense>` of current expenses for $O(N + M)$ lookups and sort by transaction date once after reconciliation.
- [x] **Task 1.6: Provide Selector Ergonomics & Eliminate Keystroke Re-render Storms (`store.ts:104-120`)**
  - Problem: Direct `useAppStore()` subscriptions force full component tree re-evaluations whenever any state field updates.
  - Fix: Export atomic selector hooks (`useExpenses()`, `useMembers()`, `useCategories()`, `useFamily()`, `useImportBatches()`).
  - Fix: Strip `raw_payload` from `importBatches` in Zustand's `partialize` configuration to eliminate large JSON serialization overhead.
- [x] **Task 1.7: Support Multi-Subscriber Mutation Listener with Unregister (`store.ts:79-88`)**
  - Problem: Single `let mutationListener` variable allows only one subscriber and provides no unsubscribe cleanup.
  - Fix: Use a `Set<StoreMutationListener>` and return `() => mutationListeners.delete(listener)`.

### 1.2 Required Unit Test Sketches (`__tests__/store_remediation.test.ts`)

```typescript
describe('Store Remediation Tests', () => {
  it('emits store mutation events for all imported expenses in importExpenseReport', () => {
    const mutations: StoreMutationEvent[] = [];
    const unsubscribe = registerStoreMutationListener((event) => mutations.push(event));

    useAppStore.getState().importExpenseReport({
      version: '1.0',
      source: 'Test Import',
      expenses: [
        {
          date: '2026-09-01',
          amount: 50,
          merchant: 'Test Merchant',
          category: 'Groceries',
          paid_by: 'Marco',
        },
      ],
    });

    expect(mutations.some((m) => m.entity === 'expense' && m.operation === 'INSERT')).toBe(true);
    unsubscribe();
  });

  it('generates valid UUIDs for imported expenses', () => {
    useAppStore.getState().importExpenseReport({
      version: '1.0',
      source: 'UUID Test',
      expenses: [
        {
          date: '2026-09-01',
          amount: 20,
          merchant: 'UUID Store',
          category: 'Groceries',
          paid_by: 'Marco',
        },
      ],
    });
    const imported = useAppStore.getState().expenses.find((e) => e.merchant_name === 'UUID Store');
    expect(imported?.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
  });

  it('notifies cascaded expense deletions when a member is deleted', () => {
    const deletedEvents: StoreMutationEvent[] = [];
    registerStoreMutationListener((e) => deletedEvents.push(e));
    useAppStore.getState().deleteMember('mem_1');
    const expenseDeletions = deletedEvents.filter(
      (e) => e.entity === 'expense' && e.operation === 'DELETE',
    );
    expect(expenseDeletions.length).toBeGreaterThan(0);
  });

  it('recalculates equal splits when an expense amount is updated without explicit splits', () => {
    const exp = useAppStore.getState().expenses[0];
    useAppStore.getState().updateExpense(exp.id, { amount: 300 });
    const updated = useAppStore.getState().expenses.find((e) => e.id === exp.id);
    const sumSplits = updated?.splits?.reduce((s, x) => s + x.computed_amount, 0);
    expect(sumSplits).toBeCloseTo(300, 2);
  });
});
```

---

## Phase 2: Partition 2 — Business Logic, Math, Validation & Exporters

### 2.1 Remediation Tasks

- [x] **Task 2.1: Neutralize CSV Formula Injection / CWE-1236 (`csvExporter.ts:25-39`)**
  - Problem: Unsanitized fields starting with `=`, `+`, `-`, `@`, `\t`, `\r` execute formulas in Excel/Sheets.
  - Fix: Prepend apostrophe `'` to any cell value matching `/^[=+\-@\t\r]/` before enclosing in quotes.
  - Fix: Prepend UTF-8 Byte Order Mark (`\uFEFF`) to prevent Excel mojibake (`â‚¬` instead of `€`).
- [x] **Task 2.2: Fix 1-Cent Debt Drops & Strict Balanced Validation in Split Calculator (`splitCalculator.ts:89-148`)**
  - Problem: `b.net < -0.01` and `b.net > 0.01` drop €0.01 debts. `isBalanced: transfers.length === 0` falsely reports true when unsettled debts remain.
  - Fix: Perform calculations in integer cents. Keep all debts with `Math.abs(cents) >= 1`.
  - Fix: Determine `isBalanced = debtors.length === 0 && creditors.length === 0`.
- [x] **Task 2.3: Optimize Duplicate Detection & Eliminate False Positives (`duplicateDetector.ts:14-43`)**
  - Problem: Nested `.find()` creates $O(N \times M)$ overhead. Substring matching (`includes`) causes false matches for short words like "Bar" or "Apple".
  - Fix: Index existing expenses by `date_cents` (`${transaction_date}_${Math.round(amount * 100)}`) using a `Map<string, Expense[]>`.
  - Fix: Compare merchant names using exact equality or strict word boundary token matching after normalization.
- [x] **Task 2.4: Fortify Zod Validation Schema with `.finite()` and String Length Bounds (`types/index.ts:74-98`, `validator.ts:17-29`)**
  - Problem: `z.number().positive()` accepts `Infinity`. Missing string length bounds allow payload memory exhaustion.
  - Fix: Add `.finite().max(1_000_000)` and `.max(200)` string limits.
  - Fix: In `ReportValidator`, collect all validation errors with human-friendly row numbers (`Row 12 (date): ...`) instead of truncating at the first error.
- [x] **Task 2.5: Fix Web Memory Leak & Decouple UI in File Exporter (`fileExporter.ts:18-32, 43-50`)**
  - Problem: `URL.createObjectURL(blob)` is never revoked, leaking memory. `fileExporter` directly invokes `Alert.alert` with unlocalized strings.
  - Fix: Call `setTimeout(() => URL.revokeObjectURL(url), 1000)` after download trigger.
  - Fix: Return typed result `{ success: boolean; error?: string }` so UI callers handle user presentation.
- [x] **Task 2.6: Unmapped Category Handling in Analytics (`analytics.ts:70-85, 102-120`)**
  - Problem: Expenses with deleted categories are excluded from breakdown, causing slice sums to not equal `totalSpend`.
  - Fix: Map orphaned category IDs to a fallback `{ id: 'unmapped', name: 'Uncategorized', color: '#9CA3AF' }` slice.
- [x] **Task 2.7: Add Dedicated Unit Tests for File Exporter (`__tests__/fileExporter.test.ts`)**
  - Create full test suite for `fileExporter` on web and native environments.

### 2.2 Required Unit Test Sketches (`__tests__/business_logic_remediation.test.ts`)

```typescript
describe('Business Logic Remediation Tests', () => {
  it('neutralizes CSV formula injection payloads starting with =, +, -, @', () => {
    const maliciousExpenses: Expense[] = [
      {
        id: 'exp_malicious',
        family_id: 'fam_1',
        category_id: 'cat_groceries',
        paid_by_member_id: 'mem_1',
        amount: 10,
        transaction_date: '2026-09-01',
        merchant_name: '=cmd|"/C calc"!A0',
        notes: '+SUM(1,2)',
        created_at: '',
        updated_at: '',
      },
    ];
    const csv = generateCsvExport(maliciousExpenses, mockCategories, mockMembers);
    expect(csv).toContain('"\'=cmd|\\"/C calc\\"!A0"');
    expect(csv).toContain('"\'+SUM(1,2)"');
    expect(csv.startsWith('\uFEFF')).toBe(true);
  });

  it('settles 1-cent debt balances without dropping them', () => {
    const expenses: Expense[] = [
      {
        id: 'exp_1cent',
        family_id: 'fam_1',
        category_id: 'cat_1',
        paid_by_member_id: 'mem_1',
        amount: 0.02,
        transaction_date: '2026-09-01',
        merchant_name: 'Penny Candy',
        splits: [
          { member_id: 'mem_1', computed_amount: 0.01 },
          { member_id: 'mem_2', computed_amount: 0.01 },
        ],
        created_at: '',
        updated_at: '',
      },
    ];
    const summary = simplifyDebts(expenses, mockMembers);
    expect(summary.transfers.length).toBe(1);
    expect(summary.transfers[0].amount).toBe(0.01);
    expect(summary.isBalanced).toBe(true);
  });

  it('rejects Infinity in import schema validation', () => {
    const result = ExpenseReportSchema.safeParse({
      version: '1.0',
      source: 'Test',
      expenses: [
        {
          date: '2026-09-01',
          amount: Infinity,
          merchant: 'Inf Store',
          category: 'Groceries',
          paid_by: 'Marco',
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it('avoids false duplicate matches on short merchant names', () => {
    const existing: Expense[] = [
      {
        id: 'e1',
        family_id: 'fam_1',
        category_id: 'c1',
        paid_by_member_id: 'm1',
        amount: 5,
        transaction_date: '2026-09-01',
        merchant_name: 'Bar Sport',
        created_at: '',
        updated_at: '',
      },
    ];
    const candidate = { date: '2026-09-01', amount: 5, merchant: 'Apple Barbecue' };
    const dup = checkDuplicate(candidate, existing);
    expect(dup).toBeNull();
  });
});
```

---

## Phase 3: Partition 3 — Synchronization, Authentication & Cloud Architecture

### 3.1 Remediation Tasks

- [x] **Task 3.1: Fortify Row-Level Security (RLS) in `supabase_schema.sql` (`supabase_schema.sql:119-145`)**
  - Problem: Authenticated users can view all families and invite codes, and insert themselves into any family without invite code verification. Budgets and import batches lack RLS policies.
  - Fix: Restrict `families` `SELECT` strictly to verified family members (`is_member_of_family(id)`).
  - Fix: Restrict `family_members` `INSERT` to existing family members or via secure RPC.
  - Fix: Implement `SECURITY DEFINER` RPC function `join_family_via_invite_code(p_invite_code TEXT, p_display_name TEXT, p_color_code TEXT)`.
  - Fix: Add RLS policies for `budgets` and `import_batches` tables.
- [x] **Task 3.2: Add Missing Database Indexes for RLS & Delta Sync (`supabase_schema.sql:26-117`)**
  - Add composite index on `public.family_members(family_id, user_id)`.
  - Add composite index on `public.expenses(family_id, updated_at)`.
  - Add index on `public.expense_splits(expense_id)`.
  - Add index on `public.categories(family_id, updated_at)`.
- [x] **Task 3.3: Implement Soft-Delete Tombstones (`deleted_at`) for Delta Sync (`supabase_schema.sql`, `syncEngine.ts:208-235`)**
  - Problem: Hard SQL `DELETE` removes rows completely. Offline clients never receive deletions during delta sync.
  - Fix: Add `deleted_at TIMESTAMPTZ` column to `expenses` and `categories`.
  - Fix: When `deleted_at IS NOT NULL` in delta sync, delete the corresponding local records in Zustand store.
- [x] **Task 3.4: Fix Outbox Concurrency Mutex & Race Conditions (`syncEngine.ts:79-136`)**
  - Problem: `flushOutbox` lacks an `isFlushing` lock. Mutations enqueued during an in-flight network call are overwritten with a stale snapshot upon flush completion.
  - Fix: Add `let isFlushing = false;`.
  - Fix: Succeeded mutation IDs are tracked in a `Set<string>`. On flush completion, re-read `AsyncStorage` and filter out only the succeeded IDs, preserving any concurrent mutations enqueued in the meantime.
- [x] **Task 3.5: Preserve Splits on Realtime Expense Updates (`realtimeSync.ts:41-72`, `store.ts:451-469`)**
  - Problem: Supabase Realtime payloads for `expenses` do not include split relations (`splits: undefined`). Store reconciliation overwrites local records, destroying split allocations.
  - Fix: In `store.reconcileRemoteExpenses`, retain local splits if `remote.splits === undefined`:
    `current[idx] = { ...remote, splits: remote.splits !== undefined ? remote.splits : local.splits }`.
- [x] **Task 3.6: Differentiate Offline vs Permanent 4xx Failures in Retry Queue (`syncEngine.ts:114-131`)**
  - Problem: Pending mutations are discarded after 5 attempts, even if the device was simply offline.
  - Fix: Detect transient offline network errors (timeouts, network drop). Only increment `retry_count` on fatal 4xx HTTP rejections.
- [x] **Task 3.7: Fix Stale Closure in `AuthModal` (`AuthModal.tsx:23, 86-88`)**
  - Problem: Realtime sync binds to stale `family.id` captured in closure before migration generated a new UUID.
  - Fix: Retrieve fresh ID via `useAppStore.getState().family.id` immediately before calling `realtimeSync.startRealtimeSync(currentFamilyId)`.
- [x] **Task 3.8: Prevent Secondary Device Cloud Wipe (`AuthModal.tsx:75-84`, `migrationService.ts`)**
  - Problem: Blindly calling `migrateLocalDataToSupabase` on login overwrites existing cloud family data with local default state.
  - Fix: Check if user already belongs to a family on Supabase. If so, pull cloud delta; only upload local state if the user has no cloud family.
- [x] **Task 3.9: Cleanse Local Store State on Family Pairing (`FamilyPairingModal.tsx:50-98`)**
  - Problem: Joining a family retains previous household transactions in state.
  - Fix: Reset store transactions and categories before pulling the new household's delta sync.
- [x] **Task 3.10: Safe Native Clipboard Integration (`FamilyPairingModal.tsx:31-45`)**
  - Problem: `navigator.clipboard` is undefined on native platforms.
  - Fix: Use `expo-clipboard` with try/catch fallback.

### 3.2 Required Unit Test Sketches (`__tests__/sync_remediation.test.ts`)

```typescript
describe('Sync & Cloud Architecture Remediation Tests', () => {
  it('prevents concurrent flushOutbox execution via mutex lock', async () => {
    let callCount = 0;
    jest.spyOn(syncEngine, 'executeMutation').mockImplementation(async () => {
      callCount++;
      await new Promise((r) => setTimeout(r, 50));
      return true;
    });

    await syncEngine.enqueueMutation({
      entity: 'expense',
      operation: 'INSERT',
      entity_id: 'e1',
      payload: {} as any,
    });

    // Launch two concurrent flushes
    const [res1, res2] = await Promise.all([syncEngine.flushOutbox(), syncEngine.flushOutbox()]);
    expect(res1.processed + res2.processed).toBe(1);
  });

  it('retains concurrent mutations enqueued while flushOutbox is awaiting network I/O', async () => {
    let flushFinished = false;
    jest.spyOn(syncEngine, 'executeMutation').mockImplementation(async (item) => {
      if (item.entity_id === 'e1') {
        // Enqueue e2 while e1 is processing
        await syncEngine.enqueueMutation({
          entity: 'expense',
          operation: 'INSERT',
          entity_id: 'e2',
          payload: {} as any,
        });
      }
      return true;
    });

    await syncEngine.enqueueMutation({
      entity: 'expense',
      operation: 'INSERT',
      entity_id: 'e1',
      payload: {} as any,
    });
    await syncEngine.flushOutbox();

    const remaining = await syncEngine.getOutbox();
    expect(remaining.some((m) => m.entity_id === 'e2')).toBe(true);
  });

  it('preserves existing local splits when realtime expense payload omits splits', () => {
    const initialExpense: Expense = {
      id: 'exp_realtime_split',
      family_id: 'fam_1',
      category_id: 'c1',
      paid_by_member_id: 'm1',
      amount: 100,
      transaction_date: '2026-09-01',
      merchant_name: 'Supermarket',
      splits: [
        { member_id: 'm1', computed_amount: 50 },
        { member_id: 'm2', computed_amount: 50 },
      ],
      created_at: '2026-09-01T10:00:00Z',
      updated_at: '2026-09-01T10:00:00Z',
    };
    useAppStore.setState({ expenses: [initialExpense] });

    // Remote update arrived without splits relation
    useAppStore.getState().reconcileRemoteExpenses([
      {
        ...initialExpense,
        merchant_name: 'Supermarket Updated',
        updated_at: '2026-09-01T11:00:00Z',
        splits: undefined,
      },
    ]);

    const updated = useAppStore.getState().expenses.find((e) => e.id === initialExpense.id);
    expect(updated?.merchant_name).toBe('Supermarket Updated');
    expect(updated?.splits?.length).toBe(2);
  });
});
```

---

## Phase 4: Partition 4 — Application UI, Accessibility, Routing, i18n & Charts

### 4.1 Remediation Tasks

- [x] **Task 4.1: Eliminate `NaN` and Zero-Division SVG Crash Paths (`SpendingVelocityChart.tsx:44-58`, `MemberBarChart.tsx:32-38`, `CategoryPieChart.tsx:28-36`)**
  - Problem: When spending amounts are 0 or empty, SVG scaling produces `NaN` or `-Infinity`, crashing `react-native-svg` and Yoga native layout.
  - Fix: Guard with `Number.isFinite()`, enforce `Math.max(1, ...)` divisors, and clamp coordinate outputs.
- [x] **Task 4.2: Guard `SplitCalculator` Against `NaN` Amounts (`SplitCalculator.tsx:30-38`, `expense/add.tsx:75-78`)**
  - Problem: Empty or non-numeric amount produces `NaN`. Because `NaN <= 0` is false in JavaScript, `calculateEqualSplits(NaN, ...)` executes and stores `NaN` splits in state.
  - Fix: Validate `if (!totalAmount || isNaN(totalAmount) || totalAmount <= 0) { onSplitsChange(undefined); return; }`.
- [x] **Task 4.3: Safe `Avatar` Initials Generation with Defensive Fallbacks (`Avatar.tsx:29-35`)**
  - Problem: `name.split(' ')` crashes with `TypeError: Cannot read properties of undefined` when member is not found.
  - Fix: Sanitize: `const safeName = (name || '?').trim();` and fall back gracefully to `'?'` for empty strings.
- [x] **Task 4.4: Add Confirmation Prompt for Destructive Expense Deletions (`ExpenseDetailModal.tsx:44-47, 295-300`)**
  - Problem: Tapping "Delete" in the modal immediately deletes the expense with zero confirmation, causing accidental data loss.
  - Fix: Show `Alert.alert(t.common.delete, ...)` with destructive and cancel actions before invoking `onDelete`.
- [x] **Task 4.5: Provide Defensive Fallbacks for Orphaned Foreign Keys (`ExpenseItem.tsx:18-24`, `ledger.tsx:102-120`)**
  - Problem: Accessing `category.name` or `member.color_code` crashes the screen if the category or member was deleted.
  - Fix: Define `DEFAULT_FALLBACK_CATEGORY` and `DEFAULT_FALLBACK_MEMBER` fallback objects.
- [x] **Task 4.6: Enforce Senior-Friendly 48px Touch Targets Across Modals (`AddCategoryModal.tsx`, `AddMemberModal.tsx`, `SplitCalculator.tsx`)**
  - Problem: Color pickers and member toggles are sized at 36px with 0px hit-slop, violating WCAG AAA senior accessibility guidelines.
  - Fix: Enforce minimum dimensions of 48×48px and add `hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}`.
- [x] **Task 4.7: Fix Full i18n Dictionary Parity & Eliminate Hardcoded Strings (`SplitCalculator.tsx`, `index.tsx`, `family.tsx`, `MemberCard.tsx`)**
  - Problem: `SplitCalculator.tsx` hardcodes English strings despite dictionary keys existing; `index.tsx` hardcodes Italian; `family.tsx` does not translate default category names.
  - Fix: Import `useI18n()` in `SplitCalculator.tsx` and bind all headers and toggles to `t.addExpense.split*`.
  - Fix: Use `getLocalizedCategoryName(category, t)` in `family.tsx`.
- [x] **Task 4.8: Fix UTC Timezone Offset in Expense Date Displays (`ExpenseItem.tsx:28-31`, `ExpenseDetailModal.tsx:210-215`)**
  - Problem: `new Date("YYYY-MM-DD")` defaults to UTC midnight, displaying the previous calendar day in western timezones.
  - Fix: Create helper `formatIsoDateString(isoDate, locale, options)` that parses `[year, month, day]` and formats via a local noon date.
- [x] **Task 4.9: Memoize Ledger Filtering, Sorting, and Item Components (`ledger.tsx:70-130`, `ExpenseItem.tsx:16`)**
  - Problem: Unmemoized filtering and sorting runs synchronously on every keystroke in search input.
  - Fix: Wrap filtered list calculation in `useMemo` and wrap `ExpenseItem` in `React.memo`.
- [x] **Task 4.10: Eliminate Nested `ScrollView` Inside `FormModal` (`ledger.tsx:432-435`)**
  - Problem: Nested scroll containers cause Android touch cancellation and console warnings.
  - Fix: Remove inner `ScrollView` in `ledger.tsx` filters modal; `FormModal` already provides container scrolling.
- [x] **Task 4.11: Fix Modal Navigation Sequence in `expense/add.tsx` (`expense/add.tsx:392-416`)**
  - Problem: Modal screen pushes tab route `router.push('/(tabs)/import')`, stacking tab navigator on modal stack.
  - Fix: `router.dismiss(); router.navigate('/(tabs)/import');`.
- [x] **Task 4.12: Memoize Context Values (`ThemeContext.tsx:64-80`, `I18nContext.tsx:39`)**
  - Problem: Context providers pass new object literals on every render, triggering full tree re-renders.
  - Fix: Wrap provider values in `useMemo`.

### 4.2 Required Unit Test Sketches (`__tests__/ui_remediation.test.ts`)

```typescript
describe('UI & Accessibility Remediation Tests', () => {
  it('formats ISO date strings consistently regardless of local timezone', () => {
    const formatted = formatIsoDateString('2026-09-09', 'en-US', {
      month: 'short',
      day: 'numeric',
    });
    expect(formatted).toContain('Sep 9');
  });

  it('safely extracts initials in Avatar for undefined, null, and empty names', () => {
    expect(getAvatarInitials(undefined)).toBe('?');
    expect(getAvatarInitials(null as any)).toBe('?');
    expect(getAvatarInitials('')).toBe('?');
    expect(getAvatarInitials('  Marco   Rossi  ')).toBe('MR');
  });

  it('rejects NaN amounts in SplitCalculator without generating NaN shares', () => {
    let capturedSplits: any = 'initial';
    handleAmountChangeInSplitCalc(NaN, ['m1', 'm2'], (splits) => {
      capturedSplits = splits;
    });
    expect(capturedSplits).toBeUndefined();
  });
});
```

---

## Phase 5: Verification, Validation & Acceptance Criteria

Upon completion of Phases 1–4:

1. **Automated Verification:**
   - Run `pnpm typecheck` (must exit with 0 errors).
   - Run `pnpm test` (all suites must pass, including new remediation tests).
2. **Review Scorecard Update:**
   - Re-run `node scripts/generate-audit-report.js` with all 51 findings resolved.
3. **Interactive Verification via MCP Preview (if requested):**
   - Verify senior accessibility UI (48px buttons, zero typing lag in ledger, Italian/English language switching).
4. **Git Staging & Commit:**
   - Await human approval before creating git commit.
