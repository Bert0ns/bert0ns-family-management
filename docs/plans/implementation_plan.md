# 📋 Family Expense Management App — Feature Implementation Plan

## 1. Overview & Context

This implementation plan bridges the remaining feature gaps identified between [design.md](file:///home/berto/bert0ns-family-management/design.md) and the initial MVP scaffold. All implementations adhere strictly to **SOLID principles**, utilize typed React Native `StyleSheet` tokens without Tailwind, and include full Jest unit test coverage.

---

## 2. Implementation Workstreams

### Workstream 1: Interactive Period Navigation (`PeriodSelector.tsx`)
- **Goal:** Allow family members to navigate backwards and forwards across months or select a specific period.
- **Files:**
  - `src/components/common/PeriodSelector.tsx`
  - Integration into `src/app/(tabs)/index.tsx`, `src/app/(tabs)/analytics.tsx`, and `src/app/(tabs)/family.tsx`.

### Workstream 2: Split Expense Engine & UI (`SplitCalculator.tsx`)
- **Goal:** Enable splitting expenses equally or by custom amounts across selected family members.
- **Files:**
  - `src/components/ledger/SplitCalculator.tsx`
  - Integration into `src/app/expense/add.tsx` and `src/components/ledger/ExpenseDetailModal.tsx`.
  - Store support for saving split assignments.

### Workstream 3: Budget Envelope & Category Management
- **Goal:** Allow users to tap category budget envelopes to adjust limits, and add custom categories with colors and icons.
- **Files:**
  - `src/components/family/EditBudgetModal.tsx`
  - `src/components/family/AddCategoryModal.tsx`
  - Store actions for updating budgets and creating categories.

### Workstream 4: Family Member Management
- **Goal:** Allow adding new family members with roles (`ADMIN` vs `MEMBER`) and custom avatar colors.
- **Files:**
  - `src/components/family/AddMemberModal.tsx`
  - Store action `addMember`.

### Workstream 5: Import Duplicate Detection & CSV Export
- **Goal:** Detect potential duplicate transactions during JSON import staging and provide a one-click CSV export engine.
- **Files:**
  - `src/services/duplicateDetector.ts` (SRP algorithm for matching existing transactions)
  - `src/services/csvExporter.ts` (CSV string formatter and download trigger)
  - Integration into `src/components/import/ImportPreviewModal.tsx` and `src/app/(tabs)/import.tsx`.

### Workstream 6: Advanced Ledger Sorting & Multi-Criteria Filtering
- **Goal:** Support sorting by date (newest/oldest) and amount (highest/lowest), plus split badge visualization.
- **Files:**
  - `src/app/(tabs)/ledger.tsx`
  - `src/components/ledger/ExpenseItem.tsx`

### Workstream 7: Testing, Typecheck & Formatting Quality Gate
- **Goal:** Ensure 100% test pass rate, 0 type errors, and clean Prettier formatting.
- **Files:**
  - `__tests__/duplicateDetector.test.ts`
  - `__tests__/csvExporter.test.ts`
  - `__tests__/analytics.test.ts` & `__tests__/store.test.ts` updates.

---

## 3. Execution Order

1. Initialize Git repository & create initial baseline commit.
2. Build utility services (`duplicateDetector.ts`, `csvExporter.ts`).
3. Build new UI components (`PeriodSelector.tsx`, `SplitCalculator.tsx`, `EditBudgetModal.tsx`, `AddCategoryModal.tsx`, `AddMemberModal.tsx`).
4. Integrate components into screens (`index.tsx`, `analytics.tsx`, `ledger.tsx`, `import.tsx`, `family.tsx`, `expense/add.tsx`).
5. Write unit tests for new features.
6. Run `pnpm format`, `pnpm typecheck`, and `pnpm test`.
