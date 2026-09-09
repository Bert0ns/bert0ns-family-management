const fs = require('fs');
const path = require('path');

const templatePath = path.join(__dirname, '../.agents/skills/distributed-code-audit/references/audit-scorecard-template.html');
const template = fs.readFileSync(templatePath, 'utf8');

const findings = [
  // ==========================================
  // PARTITION 1: Core Domain & State
  // ==========================================
  {
    severity: 'critical',
    partition: 'P1: Core Domain & State',
    axis: 'Correctness',
    file: 'src/services/store.ts:299-387',
    title: '[P1-01] Missing Store Mutation Notifications on Batch Import Leading to Sync Omission',
    problem: 'When importExpenseReport executes, it appends expenses to Zustand via set(), but never calls notifyStoreMutation. The syncEngine is never notified, so imported transactions remain local-only and are never uploaded to Supabase or shared with family members.',
    fix: `// src/services/store.ts: inside importExpenseReport
set((state) => ({
  expenses: [...newExpenses, ...state.expenses],
  importBatches: [newBatch, ...state.importBatches],
}));

// Notify outbox of each new expense
newExpenses.forEach((exp) => {
  notifyStoreMutation({
    entity: 'expense',
    operation: 'INSERT',
    entity_id: exp.id,
    payload: exp,
  });
});`
  },
  {
    severity: 'critical',
    partition: 'P1: Core Domain & State',
    axis: 'Correctness',
    file: 'src/services/store.ts:214-266',
    title: '[P1-02] Partial Mutation Notification on Cascade Deletion Causing Database Inconsistency',
    problem: 'deleteMember cascades deletion to all expenses paid by that member and modifies joint splits in local state. However, it only emits a single DELETE event for the member. The backend database and peer devices are never told that those expenses were deleted, violating foreign key constraints and desynchronizing family balances.',
    fix: `// src/services/store.ts: deleteMember
const expensesToDelete = state.expenses.filter((e) => e.paid_by_member_id === id);
// Notify all cascaded expense deletions
expensesToDelete.forEach((e) =>
  notifyStoreMutation({ entity: 'expense', operation: 'DELETE', entity_id: e.id, payload: { id: e.id } })
);
notifyStoreMutation({ entity: 'member', operation: 'DELETE', entity_id: id, payload: { id } });`
  },
  {
    severity: 'critical',
    partition: 'P1: Core Domain & State',
    axis: 'Correctness',
    file: 'src/services/store.ts:348',
    title: '[P1-03] Non-UUID ID Generation in importExpenseReport Breaking Remote DB Sync',
    problem: 'importExpenseReport generates IDs formatted as exp_imp_${Date.now()}... whereas Supabase schema defines expenses.id as UUID NOT NULL. When the syncEngine attempts to sync imported expenses, PostgreSQL rejects them with code 22P02: invalid input syntax for type uuid.',
    fix: `// src/services/store.ts: importExpenseReport
import { generateUUID } from '@/utils/uuid';

// In mapped expense creation:
id: generateUUID(),
import_batch_id: batchId,`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Correctness',
    file: 'src/services/store.ts:144-162',
    title: '[P1-04] Split De-synchronization on Expense Amount Update',
    problem: 'When updateExpense is called with a modified amount, existing splits are retained unchanged unless explicitly supplied. A 100€ split (50€ each) updated to 200€ continues reporting 50€ shares, corrupting family debt calculations.',
    fix: `// Recalculate equal splits if amount changes without explicit new splits
if (updates.amount !== undefined && updates.amount !== e.amount && nextSplits && nextSplits.length > 0) {
  nextSplits = calculateEqualSplits(updates.amount, nextSplits.map((s) => s.member_id));
}`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Performance',
    file: 'src/services/store.ts:104-120',
    title: '[P1-05] Root Store Re-renders Caused by Missing Selector Ergonomics',
    problem: 'useAppStore is consumed across all screens without selectors or shallow equality checks. Any state update (such as typing a character in the ledger search bar) triggers a full-app re-render cascade across all active tab screens.',
    fix: `export const useExpenses = () => useAppStore((s) => s.expenses);
export const useMembers = () => useAppStore((s) => s.members);
export const useCategories = () => useAppStore((s) => s.categories);
export const useAppStoreShallow = <T>(selector: (state: AppState) => T): T => useAppStore(useShallow(selector));`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Performance',
    file: 'src/services/store.ts:33, 114, 118',
    title: '[P1-06] Filter State Contamination of Core Domain Store & Keystroke Storms',
    problem: 'filters: FilterOptions is stored in the persistent AppState. Keystrokes in the search bar trigger AsyncStorage partialize serializations and root-level state invalidations on every frame.',
    fix: `// Decouple filter UI state into an unpersisted useFilterStore slice or manage locally in LedgerScreen.
export const useFilterStore = create<FilterState>((set) => ({
  filters: initialFilters,
  setFilters: (filters) => set({ filters }),
}));`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Performance',
    file: 'src/services/store.ts:427, 518-526',
    title: '[P1-07] Heavy Raw Payload Persistence in AsyncStorage via ImportBatch',
    problem: 'ImportBatch records store raw_payload: report (unparsed multi-megabyte JSON). The persist middleware runs JSON.stringify on the entire state on every update, blocking the JS thread and hitting Android AsyncStorage row limits.',
    fix: `// In partialize, strip raw_payload:
importBatches: state.importBatches.map(({ raw_payload, ...batch }) => batch),`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Architecture',
    file: 'src/services/store.ts:79-88',
    title: '[P1-08] Single Global Mutation Listener with No Multi-Subscriber or Unsubscribe Lifecycle',
    problem: 'Mutation listener is a single module variable (let mutationListener). Registering another listener clobbers syncEngine silently, and no unsubscribe function is returned.',
    fix: `const mutationListeners = new Set<StoreMutationListener>();
export const registerStoreMutationListener = (listener: StoreMutationListener): (() => void) => {
  mutationListeners.add(listener);
  return () => { mutationListeners.delete(listener); };
};`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Correctness',
    file: 'src/services/store.ts:268-297',
    title: '[P1-09] Non-Defensive Category Deletion Causing Orphaned Foreign Keys',
    problem: 'If only 1 category exists, fallbackCat evaluates to the very category being deleted. Also default categories (is_default: true) can be deleted, leaving the app without standard taxonomy.',
    fix: `if (state.categories.length <= 1) return;
const target = state.categories.find((c) => c.id === id);
if (target?.is_default) return;`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Performance',
    file: 'src/services/store.ts:404-453',
    title: '[P1-10] O(N x M) Complexity and Array Unshifting in Remote Reconciliation',
    problem: 'reconcileRemoteExpenses performs nested findIndex lookups and uses unshift(), causing O(N^2) memory copies on large transaction histories.',
    fix: `// Use a Map<string, Expense> index for O(N + M) reconciliation and sort once after merging.
const map = new Map(current.map((e) => [e.id, e]));
remoteList.forEach((remote) => {
  // LWW timestamp check...
  map.set(remote.id, remote);
});
return { expenses: Array.from(map.values()).sort(sortByDateDesc) };`
  },
  {
    severity: 'important',
    partition: 'P1: Core Domain & State',
    axis: 'Architecture',
    file: 'src/services/store.ts:504-517',
    title: '[P1-11] Direct State Mutation during Rehydration Hook in onRehydrateStorage',
    problem: 'Mutating state.categories = [...] directly in onRehydrateStorage callback bypasses Zustand internal subscription notifications and does not mark state dirty.',
    fix: `useAppStore.setState((state) => ({
  categories: [...state.categories, bankCat],
}));`
  },
  {
    severity: 'suggestion',
    partition: 'P1: Core Domain & State',
    axis: 'Architecture',
    file: 'src/services/store.ts:76, src/types/index.ts:13, 67',
    title: '[P1-12] Untyped any in Mutation Payloads Violating TypeScript Rigor',
    problem: 'StoreMutationEvent.payload: any and OutboxMutation.payload: any bypass TypeScript compiler checking in store and sync engine.',
    fix: `export type StoreMutationEvent =
  | { entity: 'expense'; operation: MutationOperation; entity_id: string; payload: Expense | { id: string } }
  | { entity: 'member'; operation: MutationOperation; entity_id: string; payload: FamilyMember | { id: string } }
  | { entity: 'category'; operation: MutationOperation; entity_id: string; payload: Category | { id: string } };`
  },

  // ==========================================
  // PARTITION 2: Business Logic & Export
  // ==========================================
  {
    severity: 'critical',
    partition: 'P2: Business Logic & Export',
    axis: 'Security',
    file: 'src/services/csvExporter.ts:25-39',
    title: '[P2-01] CSV Formula Injection (CWE-1236) in CSV Exporter',
    problem: 'User input in merchant_name, notes, or payment_method beginning with =, +, -, @, \\t, \\r is wrapped in quotes but not prepended with an apostrophe. Opening the exported CSV in Excel or Google Sheets executes arbitrary formulas/DDE commands.',
    fix: `const escapeCell = (val: string | number | boolean | undefined): string => {
  if (val === undefined || val === null) return '""';
  let str = String(val).replace(/"/g, '""');
  if (/^[=+\\-@\\t\\r]/.test(str)) str = \`'\${str}\`;
  return \`"\${str}"\`;
};`
  },
  {
    severity: 'critical',
    partition: 'P2: Business Logic & Export',
    axis: 'Correctness',
    file: 'src/services/splitCalculator.ts:89-148',
    title: '[P2-02] Silent 1-Cent Debt Erasure and False isBalanced in Debt Simplification',
    problem: 'Balances with net of +0.01 or -0.01 are discarded by b.net < -0.01 and b.net > 0.01. Furthermore, if remaining debts cannot be paired with creditors, transfers is empty and isBalanced: transfers.length === 0 falsely reports true.',
    fix: `// Operate in integer cents throughout. Retain debts where Math.abs(cents) >= 1.
const debtors = balances.filter((b) => b.netCents < 0);
const creditors = balances.filter((b) => b.netCents > 0);
// Verify isBalanced accurately:
const isBalanced = debtors.length === 0 && creditors.length === 0;`
  },
  {
    severity: 'critical',
    partition: 'P2: Business Logic & Export',
    axis: 'Performance',
    file: 'src/services/duplicateDetector.ts:14-43',
    title: '[P2-03] O(N x M) Duplicate Detection & False Positives from Substring Matching',
    problem: 'checkDuplicate runs an array find() per candidate on every modal render. Merchant matching uses substring containment (exp.includes(candidate)), causing short names like "Bar" or "Apple" to match unrelated businesses.',
    fix: `// Build a date+cents composite Map index: key = \`\${date}_\${cents}\`
const expenseMap = new Map<string, Expense[]>();
existingExpenses.forEach((exp) => {
  const key = \`\${exp.transaction_date}_\${Math.round(exp.amount * 100)}\`;
  const list = expenseMap.get(key) || [];
  list.push(exp);
  expenseMap.set(key, list);
});
// Exact merchant matching or normalized tokens rather than substring containment`
  },
  {
    severity: 'important',
    partition: 'P2: Business Logic & Export',
    axis: 'Security',
    file: 'src/types/index.ts:74-98',
    title: '[P2-04] Absence of .finite() and Upper Bounds in Import Schema',
    problem: 'z.number().positive() does not reject Infinity (Infinity > 0 is true). Passing Infinity crashes downstream analytics calculations. Missing string length bounds allow unbounded payloads to exhaust memory.',
    fix: `amount: z.number().positive().finite().max(1_000_000).refine((val) => Number(val.toFixed(2)) === val),
merchant: z.string().trim().min(1).max(200),`
  },
  {
    severity: 'important',
    partition: 'P2: Business Logic & Export',
    axis: 'Readability',
    file: 'src/services/csvExporter.ts:40-50',
    title: '[P2-05] Missing Excel UTF-8 BOM Causing Mojibake for Euro Symbol and Accents',
    problem: 'Without a UTF-8 Byte Order Mark (\\uFEFF), Excel on Windows and macOS interprets CSV files using legacy Windows-1252/ANSI, rendering € as â‚¬ and corrupting Italian characters like Caffè.',
    fix: `return '\\uFEFF' + [headers.join(','), ...rows].join('\\r\\n');`
  },
  {
    severity: 'important',
    partition: 'P2: Business Logic & Export',
    axis: 'Performance',
    file: 'src/services/fileExporter.ts:18-32, 43-50',
    title: '[P2-06] Memory Leak on Web from Unrevoked Blob URLs & UI Coupling',
    problem: 'URL.createObjectURL(blob) is never released via URL.revokeObjectURL. Furthermore, fileExporter directly invokes Alert.alert with hardcoded English strings instead of returning a typed result to UI callers.',
    fix: `setTimeout(() => URL.revokeObjectURL(url), 1000);
// Return typed ExportResult: { success: boolean; error?: string }`
  },
  {
    severity: 'important',
    partition: 'P2: Business Logic & Export',
    axis: 'Readability',
    file: 'src/services/validator.ts:17-29',
    title: '[P2-07] Single-Issue Truncation & Cryptic Error Paths in Report Validator',
    problem: 'ReportValidator discards all validation issues except the first, forcing tedious one-by-one fixes. Paths like expenses.14.date confuse non-technical users.',
    fix: `// Return an array of all errors formatted for humans:
return issues.map((issue) => {
  const rowMatch = issue.path[1];
  const field = issue.path[issue.path.length - 1];
  return \`Row \${Number(rowMatch) + 1} (\${field}): \${issue.message}\`;
});`
  },
  {
    severity: 'important',
    partition: 'P2: Business Logic & Export',
    axis: 'Correctness',
    file: 'src/services/analytics.ts:70-85, 102-120',
    title: '[P2-08] Silent Dropping of Expenses with Unmapped Categories in Analytics',
    problem: 'calculateCategoryBreakdown loops strictly over categories. Any expense with a deleted or unmapped category ID is dropped, causing category totals to not sum up to totalSpend.',
    fix: `// Iterate over expense category IDs and fall back to an "Uncategorized / Other" placeholder category.`
  },
  {
    severity: 'suggestion',
    partition: 'P2: Business Logic & Export',
    axis: 'Correctness',
    file: 'src/services/analytics.ts:56-57, 87-107',
    title: '[P2-09] Asymmetric Zero-Spend Top Spender Reporting in Analytics',
    problem: 'In months with 0 expenses, topCategory is undefined, but topSpender returns an arbitrary family member with €0.00 spend.',
    fix: `topSpender: memSummaries[0] && memSummaries[0].total > 0 ? memSummaries[0] : undefined,`
  },
  {
    severity: 'suggestion',
    partition: 'P2: Business Logic & Export',
    axis: 'Architecture',
    file: '__tests__/fileExporter.test.ts',
    title: '[P2-10] Missing Unit Test Suite for fileExporter.ts',
    problem: 'fileExporter.ts has 0% test coverage across web DOM and native expo-sharing branches.',
    fix: `// Create __tests__/fileExporter.test.ts with mocked Platform.OS, DOM elements, and expo-sharing.`
  },

  // ==========================================
  // PARTITION 3: Sync, Auth & Cloud
  // ==========================================
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Security',
    file: 'src/data/supabase_schema.sql:133-145',
    title: '[P3-01] Critical RLS Privilege Escalation: Global Family Enumeration & Membership Hijacking',
    problem: 'families SELECT policy permits any authenticated user to view all families and invite codes. family_members INSERT policy allows any authenticated user to join any family without invite code verification.',
    fix: `-- Restrict families SELECT strictly to verified members
CREATE POLICY "Only members view families" ON public.families FOR SELECT USING (public.is_member_of_family(id));
-- Secure invite code redemption RPC with SECURITY DEFINER
CREATE FUNCTION join_family_by_code(p_code TEXT) ...`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/services/realtimeSync.ts:41-72',
    title: '[P3-02] Realtime Ingest Wipes Out Expense Splits in Local Store',
    problem: 'Supabase Realtime events for expenses table do not include split relations, mapping to splits: undefined. Reconciling remote expenses unconditionally overwrites local records, wiping out all split allocations.',
    fix: `// Preserve existing splits if remote payload does not supply splits
current[idx] = {
  ...remote,
  splits: remote.splits !== undefined ? remote.splits : local.splits,
};`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/services/syncEngine.ts:79-136',
    title: '[P3-03] Outbox Concurrency Race Condition Drops Pending Mutations',
    problem: 'flushOutbox lacks an isFlushing mutex. While an async flush is awaiting network I/O, concurrent enqueueMutation calls append items to AsyncStorage. When flushOutbox finishes, it overwrites storage with its stale snapshot, permanently losing newly enqueued mutations.',
    fix: `let isFlushing = false;
// Introduce isFlushing lock. Upon flush completion, atomically filter out only successfully processed mutation IDs from the latest stored array.`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/services/syncEngine.ts:208-235',
    title: '[P3-04] Permanent Zombie Records in Delta Sync Due to Missing Deletion Tombstones',
    problem: 'Delta sync queries updated_at > lastSync. Hard SQL DELETE removes the row completely, so offline clients never receive deletion notices and retain permanent zombie records.',
    fix: `ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
// In delta sync, if deleted_at IS NOT NULL, remove from local store.`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/components/sync/AuthModal.tsx:75-84',
    title: '[P3-05] Blind Migration on Login Overwrites Cloud Household with Local Default State',
    problem: 'AuthModal unconditionally invokes migrateLocalDataToSupabase upon OTP verification. A user logging in on a secondary device with initial mock state overwrites established cloud data.',
    fix: `// Query user existing family memberships in Supabase first.
const memberships = await fetchUserFamilies(userId);
if (memberships.length > 0) {
  await syncEngine.fetchDelta(memberships[0].family_id);
} else {
  await migrationService.migrateLocalDataToSupabase(family.id, userId);
}`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Security',
    file: 'src/data/supabase_schema.sql:119-126',
    title: '[P3-06] Missing RLS Policies on budgets and import_batches Tables',
    problem: 'RLS is enabled on budgets and import_batches without creating any policies. In PostgreSQL, this results in default-deny for all authenticated and anonymous roles.',
    fix: `CREATE POLICY "Family members can view budgets" ON public.budgets FOR SELECT USING (public.is_member_of_family(family_id));
CREATE POLICY "Family members can manage budgets" ON public.budgets FOR ALL USING (public.is_member_of_family(family_id));`
  },
  {
    severity: 'critical',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/components/sync/FamilyPairingModal.tsx:50-98',
    title: '[P3-07] Family Pairing Fails to Insert Member Record and Contaminates Cross-Family Store State',
    problem: 'Joining a family updates local store family ID but never creates a family_members row in Supabase (causing subsequent RLS blocks), and fails to wipe previous family records from the local store.',
    fix: `// Call join_family_by_code RPC, cleanse local store prior to delta sync, and update currentMemberId to a member belonging to the new family.`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Correctness',
    file: 'src/components/sync/AuthModal.tsx:23, 86-88',
    title: '[P3-08] Stale Closure in AuthModal Subscribes Realtime Sync to Obsolete ID',
    problem: 'family.id captured in AuthModal closure is fam_1. After migration generates a new UUID, realtimeSync subscribes to fam_1 instead of the new UUID.',
    fix: `const currentFamilyId = useAppStore.getState().family.id;
realtimeSync.startRealtimeSync(currentFamilyId);`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Architecture',
    file: 'src/services/syncEngine.ts:114-131',
    title: '[P3-09] Non-Discriminant Retry Limit Silently Discards Outbox Mutations in Offline Mode',
    problem: 'Mutations fail when offline. After 5 retries, mutations are permanently deleted from the queue without distinguishing between offline timeouts and fatal 4xx errors.',
    fix: `// Distinguish transient network errors from permanent 4xx errors; retain offline mutations with exponential backoff.`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Security',
    file: 'src/services/supabase.ts:18-25',
    title: '[P3-10] Insecure Plaintext Auth Token Storage in AsyncStorage',
    problem: 'Supabase JWT access and refresh tokens are stored unencrypted in AsyncStorage on iOS and Android.',
    fix: `import * as SecureStore from 'expo-secure-store';
// Implement ExpoSecureStoreAdapter for Supabase auth persistence on native.`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Performance',
    file: 'src/data/supabase_schema.sql:26-117',
    title: '[P3-11] Missing Foreign Key Indexes Causing Sequential Scans on Every RLS Check',
    problem: 'No B-tree indexes exist on family_members(family_id, user_id) or expenses(family_id, updated_at). Every RLS evaluation triggers sequential table scans.',
    fix: `CREATE INDEX idx_family_members_lookup ON public.family_members(family_id, user_id);
CREATE INDEX idx_expenses_family_updated ON public.expenses(family_id, updated_at);
CREATE INDEX idx_expense_splits_exp_id ON public.expense_splits(expense_id);`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Architecture',
    file: 'src/services/realtimeSync.ts:25-30, 153-178',
    title: '[P3-12] Realtime Channel Silently Hangs on Error with Zero AppState Lifecycle Recovery',
    problem: 'Channel errors never clear activeChannel, blocking re-subscription. Realtime is only bound in the settings tab, and app backgrounding/foregrounding is not tracked.',
    fix: `// Implement exponential backoff re-subscription on error, wire realtime at root _layout.tsx, and re-sync on AppState foreground events.`
  },
  {
    severity: 'important',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Architecture',
    file: 'src/services/syncEngine.ts:143-167',
    title: '[P3-13] Non-Atomic Split Replacements Subject to Mid-Operation Data Loss',
    problem: 'Expenses and splits are modified in separate HTTP calls. Network drops after deleting splits leave expenses orphaned with 0 splits.',
    fix: `// Wrap expense upsert and split replacements in a single PostgreSQL RPC function (upsert_expense_with_splits).`
  },
  {
    severity: 'suggestion',
    partition: 'P3: Sync, Auth & Cloud',
    axis: 'Readability',
    file: 'src/components/sync/FamilyPairingModal.tsx:31-45',
    title: '[P3-14] Phantom Clipboard Copy on Native Mobile in FamilyPairingModal',
    problem: 'navigator.clipboard is undefined on native iOS/Android, but modal shows success haptic and copied banner anyway.',
    fix: `import * as Clipboard from 'expo-clipboard';
await Clipboard.setStringAsync(currentInviteCode);`
  },

  // ==========================================
  // PARTITION 4: UI, Accessibility, Routing & Charts
  // ==========================================
  {
    severity: 'critical',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/charts/SpendingVelocityChart.tsx:44-58',
    title: '[P4-01] NaN and Zero-Division Propagation in SVG Chart Components',
    problem: 'When spend totals are 0 or empty, getY produces NaN or -Infinity. Passing NaN to React Native SVG Path elements causes native thread crashes or visual corruption.',
    fix: `const maxVal = Math.max(1, ...data.map((d) => d.actualSpend || 0), ...data.map((d) => d.projectedSpend || 0));
const getY = (val: number) => {
  if (!Number.isFinite(val) || isNaN(val)) return paddingTop + innerHeight;
  return paddingTop + innerHeight - Math.min(Math.max(val / maxVal, 0), 1) * innerHeight;
};`
  },
  {
    severity: 'critical',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/ledger/SplitCalculator.tsx:30-38',
    title: '[P4-02] NaN Input in SplitCalculator Corrupts Stored Expense Splits',
    problem: 'When amount is empty, numericAmount is NaN. Because NaN <= 0 evaluates to false in JavaScript, calculateEqualSplits(NaN, ...) executes, persisting NaN split shares.',
    fix: `if (!isSplitEnabled || selectedMemberIds.length === 0 || !totalAmount || isNaN(totalAmount) || totalAmount <= 0) {
  onSplitsChange(undefined);
  return;
}`
  },
  {
    severity: 'critical',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/common/Avatar.tsx:29-35',
    title: '[P4-03] Avatar Primitive Crashes on Null, Undefined, or Whitespace-Only Name',
    problem: 'Avatar performs name.split(\' \') without null guarding. When rendering an expense with an unknown or deleted member, it crashes with TypeError: Cannot read properties of undefined (reading \'split\').',
    fix: `const initials = (name || '?')
  .trim()
  .split(/\\s+/)
  .filter(Boolean)
  .map((part) => part[0] || '')
  .join('')
  .toUpperCase()
  .substring(0, 2) || '?';`
  },
  {
    severity: 'critical',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/ledger/ExpenseDetailModal.tsx:44-47, 295-300',
    title: '[P4-04] Unconfirmed Destructive Expense Deletion',
    problem: 'Tapping Delete in ExpenseDetailModal immediately deletes the expense without confirmation, leading to accidental transaction loss when users miss the close button.',
    fix: `Alert.alert(t.common.delete, \`\${expense.merchant_name} (\${currency}\${expense.amount.toFixed(2)})?\`, [
  { text: t.common.cancel, style: 'cancel' },
  { text: t.common.delete, style: 'destructive', onPress: () => { onDelete(expense.id); onClose(); } },
]);`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/ledger/ExpenseItem.tsx:18-24',
    title: '[P4-05] Crash on Missing Member/Category Lookups Due to Orphaned Foreign Keys',
    problem: 'If a category or member was deleted or modified remotely, lookups return undefined. Components access category.name without null checks, crashing with unhandled TypeError.',
    fix: `const displayCategory = category || DEFAULT_FALLBACK_CATEGORY;
const displayMember = member || DEFAULT_FALLBACK_MEMBER;`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Correctness',
    file: 'src/components/ledger/ExpenseItem.tsx:28-31',
    title: '[P4-06] UTC Timezone Parsing Causes 1-Day Date Shift in Expense Displays',
    problem: 'new Date("YYYY-MM-DD") parses as UTC midnight, shifting back one day in negative timezones when converted to local time.',
    fix: `const [year, month, day] = isoDateString.split('-').map(Number);
const localDate = new Date(year, month - 1, day, 12, 0, 0);`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Readability',
    file: 'src/components/ledger/SplitCalculator.tsx:74, 92, 99',
    title: '[P4-07] Total I18n Omission in SplitCalculator and Hardcoded Strings Across Screens',
    problem: 'SplitCalculator.tsx does not import useI18n() and displays hardcoded English strings despite localization keys existing. Screens like index.tsx also contain hardcoded Italian phrases.',
    fix: `import { useI18n } from '@/i18n';
// Replace hardcoded strings with t.addExpense.split* keys`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Accessibility',
    file: 'src/components/family/AddCategoryModal.tsx:112-145',
    title: '[P4-08] Sub-48px Touch Targets for Color, Icon, and Split Selectors',
    problem: 'Color pickers (36px) and member chips in modals violate the WCAG AAA senior accessibility directive requiring 48-64px touch targets.',
    fix: `Enforce minWidth: 48, minHeight: 48, and hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} across all modal selectors.`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Performance',
    file: 'src/app/(tabs)/ledger.tsx:70-130',
    title: '[P4-09] Unmemoized Sorting and Multi-Pass Filtering in Render Bodies',
    problem: 'Full dataset filtering and sorting runs synchronously in the render body on every keystroke, while ExpenseItem is not wrapped in React.memo.',
    fix: `Wrap filteredExpenses in useMemo and export ExpenseItem with React.memo.`
  },
  {
    severity: 'important',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Architecture',
    file: 'src/app/(tabs)/ledger.tsx:432-435',
    title: '[P4-10] Nested ScrollView Inside FormModal Generating Gesture Conflicts',
    problem: 'FormModal wraps children in a vertical ScrollView. LedgerScreen wraps filter content in an additional ScrollView, causing Android touch cancellation and console warnings.',
    fix: `Remove inner ScrollView from ledger filter modal; FormModal already handles scrolling.`
  },
  {
    severity: 'suggestion',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Architecture',
    file: 'src/app/expense/add.tsx:392-416',
    title: '[P4-11] Modal Pushing Tab Route Causes Navigation Hierarchy Corruption',
    problem: 'Modal screen pushes tab route router.push(\'/(tabs)/import\'), leaving modal context stacked above tab navigator.',
    fix: `router.dismiss();
router.navigate('/(tabs)/import');`
  },
  {
    severity: 'suggestion',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Performance',
    file: 'src/theme/ThemeContext.tsx:64-80',
    title: '[P4-12] Missing Context Value Memoization in ThemeProvider and I18nProvider',
    problem: 'Context providers recreate fresh object values on every render, triggering full tree re-evaluations.',
    fix: `Wrap context provider values in useMemo([theme, isDark, ...]).`
  },
  {
    severity: 'suggestion',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Accessibility',
    file: 'src/components/charts/HeatmapCalendar.tsx:68-100',
    title: '[P4-13] Missing Accessibility Semantics on Custom Charts and Pickers',
    problem: 'Heatmap cells and velocity charts lack accessibilityLabel and accessibilityRole for screen readers.',
    fix: `Add accessible={true} and informative accessibilityLabel describing daily spend.`
  },
  {
    severity: 'suggestion',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Readability',
    file: 'src/components/charts/CategoryPieChart.tsx:32-47',
    title: '[P4-14] Category Pie Chart Slice Truncation Distorts Proportions',
    problem: 'Truncates data to 6 items without grouping remaining categories into an "Other" slice, causing donut slices to sum to <100%.',
    fix: `Aggregate categories beyond index 5 into a localized "Other" slice.`
  },
  {
    severity: 'nit',
    partition: 'P4: UI, A11y & Charts',
    axis: 'Performance',
    file: 'src/app/(tabs)/ledger.tsx:270-320',
    title: '[P4-15] FlatList Missing Virtualization Tuning in Ledger',
    problem: 'FlatList in ledger.tsx defines renderItem inline and omits initialNumToRender and windowSize props.',
    fix: `Extract renderItem with useCallback and add initialNumToRender={15} and windowSize={5}.`
  }
];

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const criticalCount = findings.filter((f) => f.severity === 'critical').length;
const importantCount = findings.filter((f) => f.severity === 'important').length;
const suggestionCount = findings.filter((f) => f.severity === 'suggestion').length;
const nitCount = findings.filter((f) => f.severity === 'nit').length;
const totalFindings = findings.length;

const rowsHtml = findings
  .map((f) => {
    return (
      `          <tr data-severity="${f.severity}" data-partition="${escapeHtml(f.partition)}" data-axis="${escapeHtml(f.axis)}">\n` +
      `            <td><span class="badge badge-${f.severity}">${f.severity.toUpperCase()}</span></td>\n` +
      `            <td><strong>${escapeHtml(f.partition)}</strong><br/><span class="axis-tag">${escapeHtml(f.axis)}</span></td>\n` +
      `            <td><span class="file-path">${escapeHtml(f.file)}</span></td>\n` +
      `            <td><strong>${escapeHtml(f.title)}</strong><br/>${escapeHtml(f.problem)}</td>\n` +
      `            <td><div class="code-block">${escapeHtml(f.fix)}</div></td>\n` +
      `          </tr>`
    );
  })
  .join('\n');

const output = template
  .replace('{{PROJECT_NAME}}', "Bert0n's Family Management")
  .replace('{{AUDIT_DATE}}', new Date().toISOString().slice(0, 10))
  .replace('{{TOTAL_FINDINGS}}', String(totalFindings))
  .replace('{{CRITICAL_COUNT}}', String(criticalCount))
  .replace('{{IMPORTANT_COUNT}}', String(importantCount))
  .replace('{{SUGGESTION_COUNT}}', String(suggestionCount))
  .replace('{{NIT_COUNT}}', String(nitCount))
  .replace('{{FINDINGS_TABLE_ROWS}}', rowsHtml);

const outPath = path.join(__dirname, '../docs/reports/codebase-audit-and-review-report.html');
fs.writeFileSync(outPath, output, 'utf8');

console.log(`Report generated successfully at: ${outPath}`);
console.log(`Metrics: Total: ${totalFindings} | Critical: ${criticalCount} | Important: ${importantCount} | Suggestions: ${suggestionCount} | Nits: ${nitCount}`);
