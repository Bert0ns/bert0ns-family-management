# UI/UX Mocking Specification: Family Expense Tracker

> **Prompt Purpose**: Use this specification in Stitch (or any UI prototyping tool) to generate a clean, modern, and friction-free presentation layer.  
> **Core Focus**: **WHAT the application does and HOW users interact with it.** This is a shared household expense tracker for families. Keep it functional, fast, and clutter-free.

---

## 1. Core Mission & Design Rules

### 1.1 App Identity & Purpose

A shared family expense tracker and household ledger. The primary purpose of this app is to:

1. **Quickly log shared household expenses** (groceries, bills, children's expenses, home maintenance).
2. **Maintain a clear chronological ledger** of who bought what for the family.
3. **Automatically calculate fair shares and settle balances** between family members ("who owes who") with zero manual math.
4. **Track monthly spending** across categories and family members.
5. **Import bank statements in bulk** without manual data entry.

### 1.2 Strict Anti-Clutter Rule: NO SUBTITLES OR EXPLANATORY BLURBS

> ⚠️ **CRITICAL UI DIRECTIVE: ABSOLUTE BAN ON SUBTITLES**  
> **Do not generate explanatory subtitles, helper descriptions, or captions under headers, cards, buttons, or images.**
>
> - AI mockups notoriously spam redundant text (e.g., placing _"Download full transaction history in CSV or JSON"_ under _"Export Ledger"_, or _"Offline storage active"_ under _"Cloud Sync"_).
> - **Every header, button, card, and action MUST stand on its own with a single clear title or icon.**
> - Cut all fluff. If an icon and title convey the action, eliminate any secondary descriptive sentences.

### 1.3 Universal Ergonomics (Accessible Across All Ages)

The app must be comfortable for the entire family, from teenagers to grandparents:

- **Large Touch Targets**: Minimum 56px–64px height on all interactive elements (buttons, category cards, selectors).
- **High Contrast & Sharp Readability**: Crisp numbers and bold text. No tiny 10px–12px faint grey text.
- **Icon-Driven Recognition**: Replace wordy labels with universally recognized visual icons wherever possible (e.g., shopping cart, home, lightning bolt, car, fork/knife, trash can, checkmark).
- **Frictionless Entry**: Logging a typical expense should take no more than 3 taps.
- **Clear Boundaries**: High-contrast borders and distinct surfaces so buttons and cards look immediately pressable.

---

## 2. Navigation Structure

### 2.1 The Signature Floating Glassmorphic Bottom Navigation Bar

The app features a distinct, modern **floating glassy bottom bar** that must be maintained in the mockups:

- **Floating Island / Pill Geometry**: Rather than a standard edge-to-edge docked bar, it floats above the content with rounded pill corners (radius ~28px), side margins, and elevation above the bottom edge.
- **Frosted Glass / Glassmorphism Aesthetic**: Translucent frosted glass effect (high backdrop blur with semi-transparent tint, crisp subtle glass border, and soft ambient shadow).
- **Minimalist Icon-Only Design**: Strictly **no text labels under the icons** (`tabBarShowLabel: false`). The bar remains clean, modern, and uncluttered.
- **Comfortable Touch Targets**: Full 64px height distributed evenly across the 5 primary tabs with large, centered icons (25px+).
- **Clear Active State**: The currently active tab icon highlights in vibrant accent color, while inactive icons remain clean and subdued.

### 2.2 Primary Tab Destinations

1. **Dashboard** (Layout Dashboard icon): Current month total, quick-add action, member spending breakdown, and recent transactions.
2. **Ledger** (Receipt / List icon): Searchable, filterable list of all family expenses.
3. **Analytics** (Pie / Chart icon): Spending by category, member comparisons, and the "Who Owes Who" debt-settlement tool.
4. **Family** (Users / Household icon): Household members and expense categories management.
5. **Settings** (Gear / Settings icon): Cloud synchronization, family pairing, data backup, language, and preferences.

### 2.3 Dedicated Modal Flows

- **Add Expense Screen**: Fast 3-tap modal/screen for logging an expense.
- **Import Hub**: Bank statement AI prompt converter, JSON drag-and-drop, and ledger exports.

---

## 3. Screen Specifications (Functional & Subtitle-Free)

### Screen 1: Dashboard (Household Overview)

#### What the Screen Does:

Presents an instant answer to household financial status: current month spending, who paid what, and recent family expenses.

#### Screen Elements:

1. **Header & Month Stepper**:
   - Left and right arrow buttons (`<` and `>`) flanking the current month and year (e.g., "September 2026").
   - Single tap navigates to previous or next month.
   - Cloud sync icon in the corner.
   - _No subtitles or date range explanations._
2. **Hero Monthly Spending Total**:
   - Massive, high-contrast currency display (e.g., `€ 1.240,50`).
   - Compact transaction counter pill directly below (e.g., `24 Transazioni`).
   - _No subtitle blurbs like "Total family spending this month"._
3. **Primary Action Buttons**:
   - **Giant "Add Expense" Button**: Full-width primary button (64px height) with a bold `+` icon.
   - **Bulk Import Button**: Distinct secondary button with document icon for importing bank statements or JSON files.
4. **Family Member Spending**:
   - Section title: "Membri della Famiglia" (or users icon).
   - Card for each family member showing:
     - Member avatar with assigned color.
     - Member name.
     - Monthly total spent (e.g., `€ 620,00`).
     - Percentage of total family spend (e.g., `50%`).
   - _No descriptive text._
5. **Recent Transactions Feed**:
   - Section header with title and a "View All" link to the Ledger.
   - 5 most recent transactions for the selected month.
   - Each item row contains:
     - Large category icon in a colored badge.
     - Merchant or expense title.
     - Transaction date.
     - Payer avatar.
     - Bold amount in EUR.
   - Tapping any row opens the Expense Detail Modal.

---

### Screen 2: Add Expense (Fast 3-Tap Logging)

#### What the Screen Does:

Allows any family member to record an expense in under 5 seconds with minimal typing.

#### Screen Elements:

1. **Hero Amount Input**:
   - Huge numeric input with currency symbol (`€ 0,00`).
   - Opens the native numeric decimal keypad automatically.
   - _No helper text underneath._
2. **Category Selection Grid**:
   - Grid of large, distinct category tiles (min height 68px): Groceries, Utilities, Dining, Health, Transport, Home, Leisure, Other.
   - Each tile has an icon and category name.
   - Selected tile is highlighted with a thick border and checkmark.
3. **Date Selector**:
   - 3 large segmented buttons: `[ Today ]`, `[ Yesterday ]`, `[ Custom Date ]`.
   - Defaults to `Today`. Tapping `Custom Date` reveals a date picker.
4. **Payer Selector ("Paid By")**:
   - Row of family member avatar cards.
   - Defaults to the active member. Single tap changes the payer.
5. **Optional Details (Collapsible Section)**:
   - Single toggle: _"More Options"_ with chevron.
   - When opened, reveals:
     - **Merchant Input**: Text field for store name (defaults to category name if empty).
     - **Split Calculator**: Quick toggle to divide the cost equally or pick specific family members who share the expense.
     - **Notes**: Text field for additional details.
   - _No explanatory captions._
6. **Save Button**:
   - Sticky bottom button (64px height) with checkmark icon and "Save Expense" label.

---

### Screen 3: Ledger (Family Transaction History & Filters)

#### What the Screen Does:

Provides a complete, searchable list of all family expenses with intuitive filtering and sorting.

#### Screen Elements:

1. **Search & Quick Actions**:
   - Search bar with magnifying glass icon and clear `X` button.
   - Filter button (funnel icon) with badge showing active filter count.
   - Quick Add `+` button.
2. **Quick Date Presets Bar**:
   - Horizontal scrolling pills: `[ All ]`, `[ This Month ]`, `[ Last Month ]`, `[ Last 3 Months ]`, `[ This Year ]`.
3. **Active Filter Chips**:
   - Dismissible chips for active filters (e.g., `Marco ×`, `Groceries ×`, `> 100€ ×`) and a `Clear All` button.
4. **List Summary & Sort Toggle**:
   - Live summary: `{X} Transactions • € {Total}`.
   - Sort button that cycles through: _Date Newest -> Date Oldest -> Amount Highest -> Amount Lowest_.
5. **Transaction List**:
   - Large, clear rows showing: Category icon, Merchant name, Date, Payer avatar, and Amount.
   - Tap any row to view full details.
6. **Filter Modal (Opened via Funnel Icon)**:
   - Clean selection sheet without subtitles:
     - Date preset buttons.
     - Amount bracket buttons (`< 20€`, `20€ - 100€`, `> 100€`, `All`).
     - Family member selector pills.
     - Category selector pills.
     - "Apply Filters" button.

---

### Screen 4: Transaction Detail Modal

#### What the Screen Does:

Shows the complete breakdown of a single expense and provides safe deletion.

#### Screen Elements:

- Close button (`X`) and drag handle.
- Large Category icon, Merchant name, and prominent Amount.
- Clear data rows:
  - **Category**: Icon + Category Name badge.
  - **Paid By**: Payer Avatar + Name.
  - **Date**: Formatted transaction date.
  - **Payment Method**: (e.g., Card, Cash).
  - **Split Breakdown**: List of members and each person's exact share in EUR.
  - **Notes**: Notes text (if entered).
- **Delete Button**: Red button with trash can icon. Requires confirmation before deletion.
- _Strictly no subtitles._

---

### Screen 5: Analytics & Debt Settlement ("Chi Deve a Chi")

#### What the Screen Does:

Provides high-level family spending insights and automatically calculates how family members can settle debts to equalize spending.

#### Screen Elements:

1. **Month Stepper**: Previous/Next month navigation.
2. **View Switcher (Segmented Tabs with Icons)**:
   - `[ Categories ]` (Chart icon)
   - `[ Who Owes Who ]` (Two-way arrows icon)
   - `[ Members ]` (Users icon)
   - `[ Trends ]` (Trending line icon)
   - `[ Heatmap ]` (Calendar icon)
3. **Tab 1: Categories Breakdown**:
   - Category distribution chart.
   - Ranked spending list by category.
   - Top 5 Merchants list with amounts.
4. **Tab 2: Who Owes Who (Debt Settlement)**:
   - **Fair-Share Settlement Cards**: Direct pair-wise settlement instructions:  
     `[Debtor Avatar] owes € {Amount} to [Creditor Avatar]`
   - When all debts are balanced: displays a clear _"All accounts in balance!"_ card.
   - Member balance summary: Total Paid vs. Fair Share.
5. **Tab 3: Members Breakdown**:
   - Comparative spending bars for each family member.
6. **Tab 4: Spending Trends**:
   - Cumulative monthly spending trajectory curve and daily pace.
7. **Tab 5: Activity Heatmap**:
   - Calendar grid showing high-spending vs. zero-spending days.

- _Strictly no explanatory subtitles anywhere on charts or tabs._

---

### Screen 6: Family & Categories Management

#### What the Screen Does:

Allows household admins to manage family members and customize expense categories.

#### Screen Elements:

1. **Family Workspace Card**:
   - Family name (e.g., "Famiglia Rossi"), currency (`EUR €`), and member count badge.
2. **Family Members Section**:
   - Header with member count and `Add Member` button (`+`).
   - Member cards displaying:
     - Avatar with distinct color.
     - Name and role badge (`Admin`, `Member`, `Viewer`).
     - Monthly total spent and transaction count.
   - Tap member card to open **Edit Member Modal** (change name, role, color, or delete member).
   - **Add Member Modal**: Name input, role selector, color picker, save button.
3. **Expense Categories Section**:
   - Header with category count and `Add Category` button (`+`).
   - Category list: Category icon, name, monthly spend total, and transaction count.
   - **Add Category Modal**: Name input, icon picker, color palette, save button.

---

### Screen 7: Settings & Data Sovereignty

#### What the Screen Does:

Configures sync, pairing, backups, and app preferences. Zero subtitles or wordy disclaimers.

#### Screen Elements:

1. **Household Profile**:
   - Editable family name input with save button.
   - Currency display: `EUR (€)`.
2. **Appearance & Language**:
   - Theme selector: `System`, `Light`, `Dark`.
   - Language selector: `Italiano`, `English`.
3. **Cloud Sync & Family Pairing**:
   - Status badge: `Offline Mode` or `Synced`.
   - Action buttons:
     - `Connect Cloud Account` (email sign-in modal).
     - `Family Pairing` (generates or accepts 6-character family link code).
     - `Sync Now` (forces manual sync).
4. **Notification Switches**:
   - Master push switch.
   - Toggle options:
     - Statement batch imports.
     - Expense edits and deletions.
     - Debt settlement updates.
     - Member joins and role updates.
5. **Data Management & Backups**:
   - `Export JSON Backup` button.
   - `Reset Sample Data` button.
   - `Clear All Expenses` (Danger Zone: red button with double-confirmation dialog).
6. **Version & Privacy Seal**:
   - Version number and local-first privacy badge.

---

### Screen 8: Bulk Import & AI Statement Extraction Hub

#### What the Screen Does:

Enables fast bulk import of bank statements or spreadsheets into the family ledger.

#### Screen Elements:

1. **3-Step AI Statement Converter**:
   - **Step 1: "Copy AI Prompt" Button**: Copies a prompt containing active family categories and member names to paste into ChatGPT/Claude along with a bank PDF.
   - **Step 2**: External conversion in user's preferred AI tool.
   - **Step 3: "Paste JSON" or File Upload**:
     - `Paste JSON` button (opens clean modal to paste raw text).
     - Drag-and-drop file dropzone for `.json` files.
2. **Pre-Import Review Modal**:
   - Total records to import, total amount, and date range.
   - Clear duplicate transaction warning badges if matching records are detected.
   - `Confirm Import` button.
3. **Export Ledger**:
   - `Export CSV` button (for Excel / Google Sheets).
   - `Export JSON` button.
4. **Import History**:
   - List of previous import batches with date, file name, and record count.

---

## 4. UI Style & Formatting Summary for Stitch

| UI Element                       | Specification Rule                                                                                                                                                                                                              |
| :------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Bottom Navigation Bar**        | **Signature Floating Glassmorphism**: Rounded floating pill (radius ~28px, elevated with margins), translucent frosted glass blur effect, strictly icon-only (no text labels), 64px touch height, vibrant accent on active tab. |
| **Subtitles / Explanatory Text** | **FORBIDDEN**. No helper sentences, captions, or descriptions under headers, cards, or buttons.                                                                                                                                 |
| **Primary Actions**              | Minimum **56px–64px height**, high-contrast fill, bold text, clear icons.                                                                                                                                                       |
| **Monetary Values**              | Always bold, prominent, and paired with currency symbol (`€`).                                                                                                                                                                  |
| **Typography**                   | Crisp, high-contrast, zero small faint grey text (< 14px).                                                                                                                                                                      |
| **Iconography**                  | Prominent standard icons (shopping cart, car, house, fork/knife, pill/cross, lightning bolt, trash can, checkmark, arrows).                                                                                                     |
| **Data Hierarchy**               | Clean cards with 1.5px–2px distinct borders separating interactive sections from the background.                                                                                                                                |
