---
name: Kinetic Ledger
colors:
  surface: '#0b1326'
  surface-dim: '#0b1326'
  surface-bright: '#31394d'
  surface-container-lowest: '#060e20'
  surface-container-low: '#131b2e'
  surface-container: '#171f33'
  surface-container-high: '#222a3d'
  surface-container-highest: '#2d3449'
  on-surface: '#dae2fd'
  on-surface-variant: '#bbcabf'
  inverse-surface: '#dae2fd'
  inverse-on-surface: '#283044'
  outline: '#86948a'
  outline-variant: '#3c4a42'
  surface-tint: '#4edea3'
  primary: '#4edea3'
  on-primary: '#003824'
  primary-container: '#10b981'
  on-primary-container: '#00422b'
  inverse-primary: '#006c49'
  secondary: '#c0c1ff'
  on-secondary: '#1000a9'
  secondary-container: '#3131c0'
  on-secondary-container: '#b0b2ff'
  tertiary: '#ffb2b7'
  on-tertiary: '#67001b'
  tertiary-container: '#ff7886'
  on-tertiary-container: '#780021'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#6ffbbe'
  primary-fixed-dim: '#4edea3'
  on-primary-fixed: '#002113'
  on-primary-fixed-variant: '#005236'
  secondary-fixed: '#e1e0ff'
  secondary-fixed-dim: '#c0c1ff'
  on-secondary-fixed: '#07006c'
  on-secondary-fixed-variant: '#2f2ebe'
  tertiary-fixed: '#ffdadb'
  tertiary-fixed-dim: '#ffb2b7'
  on-tertiary-fixed: '#40000d'
  on-tertiary-fixed-variant: '#92002a'
  background: '#0b1326'
  on-background: '#dae2fd'
  surface-variant: '#2d3449'
typography:
  display-currency:
    fontFamily: Space Grotesk
    fontSize: 44px
    fontWeight: '700'
    lineHeight: 52px
    letterSpacing: -0.03em
  display-currency-mobile:
    fontFamily: Space Grotesk
    fontSize: 34px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Space Grotesk
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '500'
    lineHeight: 24px
  label-lg:
    fontFamily: Space Grotesk
    fontSize: 16px
    fontWeight: '700'
    lineHeight: 20px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Space Grotesk
    fontSize: 14px
    fontWeight: '700'
    lineHeight: 18px
    letterSpacing: 0.03em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.25rem
  space-xs: 0.5rem
  space-sm: 0.75rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.25rem
---

## Brand & Style

The design system is engineered for multi-generational household financial autonomy. It balances the precision of an institutional ledger with the tactile immediacy of a physical passbook. Designed to bridge ergonomic requirements from teenagers managing allowances to grandparents tracking shared utilities, it dispenses with cognitive friction by eliminating auxiliary microcopy, subtitles, and explanatory captions.

The aesthetic is High-Contrast Tactile Modernism infused with structured Glassmorphism. Visual communication is strictly direct: every element bears a singular, high-clarity title or universally recognized iconography. Solid boundaries, deliberate structural borders, elevated card chassis, and generous touch points ensure immediate legibility under varied lighting conditions and across different digital proficiencies.

## Colors

The palette leverages a deep charcoal/slate canvas (`#0F172A`) paired with deliberate, functional accents to deliver an absolute signal-to-noise ratio:

- **Primary (`#10B981` / `#059669`):** Reserved exclusively for positive cash flow, settled debts, healthy shared balances, and primary confirmations.
- **Secondary (`#6366F1`):** Represents household identity, group pots, member allocation indicators, and neutral shared assets.
- **Tertiary (`#F43F5E`):** Denotes expenses, debits, pending settlements, warnings, and destructive actions.
- **Neutral Canvas & Tiers:**
  - Canvas Base: `#0F172A` (deep ink slate)
  - Surface Tiers: `#1E293B` (primary card chassis), `#334155` (nested interactive tiles)
  - Boundaries: `#475569` (structural 1.5px/2px strokes)
  - High-Contrast Text: `#F8FAFC` (100% white/ink for high-readability metrics), `#E2E8F0` (secondary labels)

Every color state maintains a minimum WCAG AAA contrast ratio (7:1) against its immediate backing to ensure readability across all age groups.

## Typography

Typography prioritizes high optical legibility and numerical clarity. `Space Grotesk` is designated for bold ledger amounts, category headers, and state indicators, giving financial figures a confident, mono-adjacent presence without sacrificing elegance. `Plus Jakarta Sans` handles primary entity names, transaction participants, and interactive targets.

Strict constraints:

- Minimum allowable font size across the entire system is 14px. No microcopy, 10px legal disclaimers, or auxiliary captions are permitted.
- Text layers are strictly single-tier: secondary descriptive subtitles below primary headers, card summaries, or buttons are prohibited. A container bears only its direct value or title.

## Layout & Spacing

The layout is built on a compact, single-column fluid hierarchy tailored for handheld mobile devices, bounded within safe-area boundaries:

- **Touch Ergonomics:** All interactive touch points enforce an absolute minimum physical height of 56px, with primary transaction targets scaling to 64px. Gaps between adjacent interactive touchpoints maintain a minimum separation of `space-sm` (12px) to eliminate mis-taps.
- **Outer Canvas Margins:** Strict 20px (`1.25rem`) side gutters keep vital ledger data away from screen edges.
- **Bottom Navigation Clearance:** A mandatory 96px dead-space margin is enforced at the base of scroll views to prevent the floating glassmorphic dock from occluding bottom cards or CTA actions.
- **Rhythm:** Elements within cards stack with `space-sm` (12px) and `space-md` (16px), whereas distinct sections and major cards separate with `space-lg` (24px).

## Elevation & Depth

Visual hierarchy is maintained through tactile layering and structural borders rather than heavy atmospheric drops:

- **Base Layer (0dp):** Deep ink background (`#0F172A`).
- **Surface Cards (1dp):** `#1E293B` surrounded by a tactile, physical stroke of 1.5px solid `#334155`. Soft ambient shadow: `0 4px 16px -2px rgba(0, 0, 0, 0.45)`.
- **Raised Interactive Buttons (2dp):** High-saturation solid color fills accented by an inset highlight stroke (`inset 0 1px 0 rgba(255, 255, 255, 0.2)`), offering physical affordance.
- **Floating Island Navigation (3dp):** Elevated above the base plane with 20px lateral margins and 16px bottom floating offset. Constructed using a frosted glass substrate (`rgba(15, 23, 42, 0.82)` with `24px` backdrop-filter blur) encapsulated by a 1.5px high-contrast stroke (`rgba(255, 255, 255, 0.16)`) and cast shadow: `0 12px 32px 0 rgba(0, 0, 0, 0.55)`.

## Shapes

The geometric framework balances friendly accessibility with ledger precision:

- Standard data cards and container surfaces use a rounded radius of `16px` (`rounded-lg`).
- Form elements, ledger row items, and primary buttons share a consistent radius of `16px` for structural continuity.
- The floating bottom navigation island and quick-action pills enforce a full pill-radius of `28px-9999px` (`rounded-full`), clearly separating navigational frame mechanics from content containers.
- All structural boundaries must render explicit tactile strokes of 1.5px or 2px thickness to ensure sharp definition against the dark background.

## Components

### Floating Glassmorphic Pill Navigation

- **Dimensions & Placement:** 64px fixed height, floating 16px above the home indicator, inset 20px from left and right edges.
- **Material:** `rgba(15, 23, 42, 0.82)` backdrop blur (24px), full pill radius (`rounded-full`, 32px), 1.5px stroke of `rgba(255, 255, 255, 0.16)`.
- **Navigation Targets:** 4 to 5 icon-only slots evenly distributed. Text labels and auxiliary descriptions are forbidden. Minimum touch zone per item is 56px × 56px.
- **Active State:** The active item is enveloped in a high-contrast pill badge (`#10B981` or `#6366F1`) with active icon rendered in high-contrast neutral or canvas base.

### Primary Ledger Cards

- **Structure:** Solid `#1E293B` background with 1.5px `#334155` border.
- **Content Policy:** Displays strictly the single category title (e.g., "Groceries", "Electric Utility") and the standalone numeric currency value (`Space Grotesk`, bold). Subtitles such as "Spent yesterday" or "Shared with 3 people" are strictly omitted.
- **Affordance:** Optional avatar badge stack or category icon container (44px × 44px) aligned flush with the single bold title.

### Buttons & Quick Triggers

- **Sizing:** Minimum height of 56px; primary workflow action buttons (e.g., "Add Expense", "Settle Up") occupy 64px height.
- **Style:** Flat solid fills (`#10B981` for positive/complete, `#F43F5E` for payment debits, `#6366F1` for split groups) with bold, high-contrast typography (`label-lg`). No sub-labels or descriptions beneath the action verbs.
- **Feedback:** Tactile 1.5px solid border with an active state scale down (`transform: scale(0.98)`).

### Input Fields & Selectors

- **Sizing:** Fixed 60px height. Large, high-visibility input characters (18px-24px).
- **Style:** Surface `#1E293B`, framed in 2px `#334155`. Transitions to 2px `#6366F1` on focus. No floating hint labels or explanatory help text underneath. Placeholder text directly declares the input field target.

### Transaction Row Items

- **Dimensions:** 64px touch target height.
- **Layout:** Leading bold visual category badge (48px square or circle), single transaction title, and trailing bold currency amount with colored balance indicators (`#10B981` for credit, `#F43F5E` for debit). No timestamp subtitles or breakdown text.
