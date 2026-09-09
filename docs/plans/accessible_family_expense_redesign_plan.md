# Implementation Plan: Senior-Friendly & Accessible Family Expense Tracking

## Overview

Transform the application into a friction-free, senior-accessible ("boomer-proof") household expense tracker. The core goals are:

1. **Pillar 1 — Frictionless Quick-Add**: Native input with native decimal keyboard, auto-defaults, big category selection, and 3-tap completion. No custom numpad from scratch.
2. **Pillar 2 — Radical Decluttering & Senior Accessibility**: 60px+ touch targets, high contrast, minimal text and jargon, elimination of visual noise, and large legible typography.
3. **Pillar 3 — Deep & Intuitive Filtering**: Visual filter drawer supporting date presets, multi-select categories and members, amount brackets, and clear summary totals.
4. **Pillar 4 — High-Quality Visual Charts**: Uncluttered spending velocity trajectory, ranked category bars with drill-down, and a simplified "Who Owes Who" household fair-share visual.

---

## Architecture & Design Decisions

- **Native Input System**: Use React Native's `<TextInput keyboardType="decimal-pad" />` with automated formatting, huge font size (38-44pt), and immediate auto-focus. Avoid crafting a custom button dialer from scratch.
- **Accordion / Progressive Disclosure**: 90% of expenses only require Amount + Category. Defaults handle Date (Today) and Payer (Current Member). Notes, custom dates, and split adjustments are tucked inside a secondary collapsible drawer.
- **Accessibility Tokens (WCAG AAA Focus)**:
  - Minimum touch target: 56px - 64px.
  - High contrast ratio (7:1+ for text, clear borders on cards and buttons).
  - Reduced screen density: Max 2–3 primary elements per screen section.
- **Zustand Filter Extensions**: Expand `FilterOptions` to support multi-select categories (`selectedCategoryIds: string[]`), multi-select members (`selectedMemberIds: string[]`), amount brackets (`amountBracket: 'all' | 'under_20' | '20_to_100' | 'over_100'`), and date presets (`periodPreset: 'current_month' | 'last_month' | 'last_3_months' | 'year' | 'all'`).
- **Deterministic Settlement Visualizer**: Compute pairwise debt minimization without technical accounting terminology (e.g., "Chi deve a chi" / "Who owes who" with clear avatar-to-avatar balance arrows).

---

## Execution Plan & Task Breakdown

### Pillar 1: Frictionless Native Quick-Add

#### Task 1.1: Redesign Add Expense Screen (`src/app/expense/add.tsx`)

- **Native Decimal Input**:
  - Full-width hero input with `keyboardType="decimal-pad"`, `autoFocus={true}`, and `returnKeyType="done"`.
  - Massive currency prefix (e.g. `€`) and numbers (fontSize: 40px, bold, high contrast).
  - Automatic parsing of commas and dots (`replace(',', '.')`).
- **Visual Category Grid**:
  - 2-column or 3-column large cards (min-height 68px).
  - High-contrast icon badge with bold category label.
  - Instant selection state with thick border and vibrant highlight.
- **Smart Defaults**:
  - Payer defaults to `currentMemberId` (with one-tap pill selector to change).
  - Date defaults to _Today_, with one-tap pill buttons for [Today] and [Yesterday], plus date picker for other dates.
- **Collapsed Optional Section**:
  - Merchant name, notes, and split overrides collapsed under an "Optional details" / "Altre opzioni" toggle.
- **Hero Save Button**:
  - Sticky bottom button (min height 60px) with haptic feedback on save.

**Files:**

- `src/app/expense/add.tsx`
- `src/i18n/en.ts` & `src/i18n/it.ts`

---

### Pillar 2: Radical Decluttering & Senior-Friendly Accessibility

#### Task 2.1: Design Tokens & Accessibility Theme Updates (`src/theme/tokens.ts`)

- Add accessible sizing standards:
  - `touchTargets`: `{ sm: 48, md: 56, lg: 64, xl: 72 }`
  - High contrast color variants (pure black/white backgrounds with 1.5px/2px borders for card separation).
  - Scaled typography for high readability: `fontSizes.giant: 38`, `fontSizes.hero: 44`.

#### Task 2.2: Declutter Dashboard Screen (`src/app/(tabs)/index.tsx`)

- Replace dense multi-card layout with senior-friendly focal points:
  1. **Giant Month Spending Hero**: Massive spend figure (`€ 1.240`) with clean sub-badge showing comparison or count.
  2. **Huge "Add Expense" Quick Action**: Full-width, prominent 64px button right at the top.
  3. **Simplified Recent Transactions**:
     - Large 64px row items with big category icons and prominent amount text.
     - Strip clutter: remove micro-timestamps, small status chips, and technical tags from the main list.
     - Single tap opens the clear details modal.

#### Task 2.3: Navigation & Global Component Polish

- Bottom Tab Bar: Ensure icon touch target is comfortably large (min 56px height) and icons are bold.
- Modal & Alert Dialogs: Increase button heights and font sizes across `ExpenseDetailModal` and confirmation sheets.

**Files:**

- `src/theme/tokens.ts`
- `src/app/(tabs)/index.tsx`
- `src/app/(tabs)/_layout.tsx`
- `src/components/ledger/ExpenseItem.tsx`

---

### Pillar 3: Deep & Intuitive Filtering

#### Task 3.1: Expand Filter State & Store Engine (`src/services/store.ts`, `src/types/index.ts`)

- Update `FilterOptions`:
  - `periodPreset`: `'current_month' | 'last_month' | 'last_3_months' | 'year' | 'all' | 'custom'`
  - `selectedCategoryIds`: `string[]` (multi-select)
  - `selectedMemberIds`: `string[]` (multi-select)
  - `amountBracket`: `'all' | 'under_20' | '20_to_100' | 'over_100'`
  - `minAmount` / `maxAmount` for custom queries
- Implement filtering logic with full backward compatibility in `store.ts`.

#### Task 3.2: Redesign Ledger Screen & Filter Drawer (`src/app/(tabs)/ledger.tsx`)

- **Active Filter Summary Bar**:
  - Prominent banner: _"12 Spese trovate • Totale: € 450,00"_
  - Clear "Azzera Filtri" (Reset) button if any filter is active.
- **Visual Filter Modal**:
  - **Period Quick-Pills**: [Questo Mese] [Mese Scorso] [Ultimi 3 Mesi] [Tutti] (large 50px pill buttons).
  - **Amount Brackets**: [< 20€] [20€ - 100€] [> 100€].
  - **Multi-select Category Grid**: Big toggleable icons with active checkmarks.
  - **Multi-select Member Selector**: Member avatars with check badges.
  - Large **"Applica Filtri"** primary CTA button.

**Files:**

- `src/types/index.ts`
- `src/services/store.ts`
- `src/app/(tabs)/ledger.tsx`
- `__tests__/store.test.ts`

---

### Pillar 4: High-Quality Visual Charts & Fair-Share Settlement

#### Task 4.1: Upgraded Visual Analytics (`src/app/(tabs)/analytics.tsx`)

- Streamline analytics into 3 high-impact, easy-to-read sections:
  1. **Category Hierarchy & Rank**:
     - Large, high-contrast donut chart paired with horizontal ranking bars.
     - Each bar displays category icon, name, percentage, and euro total in large legible text.
  2. **Spending Velocity Curve**:
     - Clean comparison line comparing this month's day-by-day spending pace vs. the previous month.
     - Clear takeaway callout: _"Stai spendendo il 12% in meno rispetto al mese scorso"_ (high readability summary, no complex stats).
  3. **Household Settlement ("Chi deve a Chi")**:
     - Visual fair-share card computing who paid what vs. who owes what.
     - Arrow diagram: [Avatar 1: Marco] ➔ [Avatar 2: Giulia] : `€ 85,00`.
     - Direct, human explanation avoiding accounting jargon.

**Files:**

- `src/app/(tabs)/analytics.tsx`
- `src/components/charts/CategoryPieChart.tsx`
- `src/components/charts/SpendingVelocityChart.tsx`
- `src/components/ledger/SettlementCard.tsx` (new)
- `src/services/analytics.ts`
- `__tests__/analytics.test.ts`

---

## Verification & Quality Gates

Each pillar will be validated against:

1. **Automated Verification**:
   - `pnpm typecheck` (0 type errors)
   - `pnpm test` (all unit and calculation tests pass)
   - `pnpm format:check` (strict formatting adherence)
2. **Senior Accessibility Checks**:
   - Minimum tap target height ≥ 56px across primary controls.
   - Text contrast meets WCAG AAA standards.
   - 3-tap quick-add flow without requiring QWERTY typing.
