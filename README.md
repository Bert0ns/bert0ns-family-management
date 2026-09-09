# 🏠 Bert0n's Family Expense Management

A modern, privacy-first, cross-platform family expense tracking and financial analytics application built with **React Native**, **Expo SDK 57**, **Expo Router**, and **TypeScript**.

---

## 🌟 Key Features

- **🔒 100% Privacy Guarantee (Zero Cloud AI)**: All financial records, expenses, and family ledger entries remain strictly private and stored locally on your device. No third-party AI models or external telemetry services read or process your family expenses.
- **📊 Real-Time Spending Analytics**:
  - **Spending Velocity Curve**: Custom SVG line & area chart tracking cumulative monthly burn.
  - **Category Distribution**: Interactive donut charts highlighting major expense buckets.
  - **Member Contribution Breakdown**: Comparative spending metrics per household member.
  - **Density Heatmap**: Daily spending activity calendar.
- **🧾 Shared Household Ledger & Split Calculation**:
  - Multi-criteria filtering by member, category, amount range, and fuzzy merchant search.
  - Cent-exact split engine ensuring remainder pennies are fairly allocated without rounding errors.
  - Automated duplicate transaction detection heuristic.
- **📥 Structured JSON Import & Backup Export**:
  - Drag-and-drop or select structured `.json` expense reports with instant Zod schema validation.
  - Full local backup export (JSON) and spreadsheet ledger export (CSV).
- **🌐 Internationalization & Theming**:
  - Full English (EN) and Italian (IT) localization.
  - Automatic Light, Dark, and System theme support with typed tokens.

---

## 📋 Expected JSON Import Format

The application includes a built-in import engine for bulk transaction ingestion. Imported JSON files are validated using **Zod** against the schema defined below.

### JSON Schema Specification

| Field              | Type     |   Required   | Description                                                                     |
| :----------------- | :------- | :----------: | :------------------------------------------------------------------------------ |
| `report_title`     | `string` |   Optional   | Title of the statement or export batch                                          |
| `currency`         | `string` |   Optional   | Currency symbol or code (e.g. `"EUR"`, `"€"`, `"USD"`, `"$"`, default: `"EUR"`) |
| `statement_period` | `object` |   Optional   | `{ start_date?: "YYYY-MM-DD", end_date?: "YYYY-MM-DD" }`                        |
| `uploaded_by`      | `string` |   Optional   | Name of the uploader                                                            |
| `expenses`         | `array`  | **Required** | Array of expense objects (minimum 1 item)                                       |

### Expense Object Fields

| Field            | Type      |   Required   | Description / Constraints                                                                                                       |
| :--------------- | :-------- | :----------: | :------------------------------------------------------------------------------------------------------------------------------ |
| `date`           | `string`  | **Required** | Date in `YYYY-MM-DD` format (e.g. `"2026-08-15"`)                                                                               |
| `merchant`       | `string`  | **Required** | Merchant or store name (e.g. `"Esselunga"`, `"Amazon"`)                                                                         |
| `amount`         | `number`  | **Required** | Positive transaction amount (e.g. `124.50`)                                                                                     |
| `category`       | `string`  |   Optional   | Category name (e.g. `"Groceries"`, `"Dining & Cafes"`, `"Utilities & Bills"`). If unmatched, falls back to `"General & Other"`. |
| `paid_by`        | `string`  |   Optional   | Household member name (e.g. `"Berto"`, `"Elena"`). If unmatched, defaults to the active user.                                   |
| `notes`          | `string`  |   Optional   | Free-text notes or description                                                                                                  |
| `payment_method` | `string`  |   Optional   | e.g. `"Credit Card"`, `"Bank Transfer"`, `"Cash"`                                                                               |
| `is_recurring`   | `boolean` |   Optional   | `true` if this is a recurring monthly bill                                                                                      |
| `split`          | `object`  |   Optional   | `{ is_split: boolean, type: "EQUAL" \| "PERCENTAGE" \| "EXACT", members?: string[] }`                                           |

### Complete JSON Example

```json
{
  "report_title": "August Household Statement",
  "statement_period": {
    "start_date": "2026-08-01",
    "end_date": "2026-08-31"
  },
  "currency": "EUR",
  "uploaded_by": "Berto",
  "expenses": [
    {
      "date": "2026-08-02",
      "merchant": "Supermarket Esselunga",
      "amount": 142.8,
      "category": "Groceries",
      "paid_by": "Berto",
      "notes": "Weekly family grocery shopping",
      "payment_method": "Credit Card",
      "is_recurring": false,
      "split": {
        "is_split": true,
        "type": "EQUAL",
        "members": ["Berto", "Elena"]
      }
    },
    {
      "date": "2026-08-05",
      "merchant": "Trattoria Romana",
      "amount": 65.0,
      "category": "Dining & Cafes",
      "paid_by": "Elena",
      "notes": "Family dinner",
      "payment_method": "Debit Card",
      "is_recurring": false
    },
    {
      "date": "2026-08-10",
      "merchant": "Enel Energia",
      "amount": 89.5,
      "category": "Utilities & Bills",
      "paid_by": "Berto",
      "notes": "Electricity bill",
      "payment_method": "Bank Transfer",
      "is_recurring": true
    },
    {
      "date": "2026-08-18",
      "merchant": "Pharmacy San Marco",
      "amount": 28.4,
      "category": "Health & Pharmacy",
      "paid_by": "Elena",
      "notes": "Vitamins and medicine",
      "payment_method": "Credit Card",
      "is_recurring": false
    }
  ]
}
```

---

## 🛠️ Project Architecture

```
bert0ns-family-management/
├── __tests__/                  # Unit & integration test suites (99.4% coverage)
│   ├── analytics.test.ts       # KPI, burn rate, velocity, and heatmap tests
│   ├── csvExporter.test.ts     # CSV generation & escape tests
│   ├── duplicateDetector.test.ts # Duplicate transaction detection tests
│   ├── i18n.test.ts            # Dictionary parity & completeness tests
│   ├── splitCalculator.test.ts # Remainder-exact split math tests
│   ├── store.test.ts           # State mutations & CRUD tests
│   └── validator.test.ts       # Zod JSON schema validation tests
├── src/
│   ├── app/                    # Expo Router tab screens & navigation
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # 6-tab navigation layout
│   │   │   ├── index.tsx       # Dashboard overview & quick actions
│   │   │   ├── analytics.tsx   # Visual charts & trend tabs
│   │   │   ├── ledger.tsx      # Filterable transaction ledger
│   │   │   ├── import.tsx      # JSON dropzone & CSV export
│   │   │   ├── family.tsx      # Household members & custom categories
│   │   │   └── settings.tsx    # Preferences, currency, themes & data reset
│   │   └── expense/
│   │       └── add.tsx         # Add expense modal screen
│   ├── components/
│   │   ├── charts/             # CategoryPieChart, MemberBarChart, SpendingVelocityChart (SVG), HeatmapCalendar
│   │   ├── common/             # Button, Card, Avatar, Badge, KPIStat, OptionSelector, FormModal, IconHelper
│   │   ├── family/             # MemberCard, AddMemberModal, AddCategoryModal
│   │   ├── import/             # JsonDropzone, ImportPreviewModal, SchemaViewer
│   │   └── ledger/             # ExpenseItem, ExpenseDetailModal, SplitCalculator
│   ├── data/                   # Mock seed data & Supabase SQL schema
│   ├── i18n/                   # Typed translation dictionaries (EN & IT)
│   ├── services/               # AnalyticsCalculator, SplitCalculator, DuplicateDetector, CsvExporter, Store
│   ├── theme/                  # Design tokens (colors, spacing, typography, radii) & ThemeContext
│   └── types/                  # Core domain models & Zod schemas
└── package.json                # Project dependencies & pnpm configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ or v20+
- **pnpm**: v9+ (`npm install -g pnpm`)\n\n> **Note**: This repository is configured strictly for `pnpm`. Please use `pnpm` exclusively to avoid package dependency conflicts.

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/bert0ns-family-management.git
cd bert0ns-family-management

# Install dependencies with pnpm
pnpm install
```

### Development Scripts

```bash
# Start the Expo development server
pnpm start

# Run in Web browser
pnpm web

# Run on Android emulator / device
pnpm android

# Run on iOS simulator (macOS required)
pnpm ios
```

### Code Quality & Testing

```bash
# Run all Jest test suites with coverage report
pnpm test --coverage

# Run TypeScript typecheck
pnpm typecheck

# Format code with Prettier
pnpm format

# Production Web Export
npx expo export -p web
```

---

## 🔒 Security & Privacy

- **Zero Cloud AI**: No financial records leave the device for external machine learning or LLM processing.
- **Local-First**: Works 100% offline out-of-the-box.
- **Optional Supabase Cloud Sync**: Pre-configured with PostgreSQL Row-Level Security (`RLS`) schema in [`src/data/supabase_schema.sql`](file:///home/berto/bert0ns-family-management/src/data/supabase_schema.sql), guaranteeing tenant isolation between families if cloud sync is activated.

---

## 📦 Local Android Builds in WSL

You can compile standalone `.apk` packages locally inside WSL using the Linux Android SDK already installed at `~/android-sdk`:

### Prerequisites (Configured in your WSL environment)

- **Linux Android SDK**: `$HOME/android-sdk`
- **NDK**: `$HOME/android-sdk/ndk/27.1.12297006`
- **Helper function** in `~/.bashrc`:
  ```bash
  eas-build-android() {
      local ndk_dir=$(ls -d $HOME/android-sdk/ndk/* 2>/dev/null | tail -n 1)
      ANDROID_HOME=$HOME/android-sdk \
      ANDROID_SDK_ROOT=$HOME/android-sdk \
      ANDROID_NDK_HOME=${ANDROID_NDK_HOME:-$ndk_dir} \
      eas build --platform android --local "$@"
  }
  ```

### Build Commands

- **Build Standalone Release APK (For relatives):**

  ```bash
  eas-build-android --profile preview
  ```

  _(Builds the installable `.apk` directly on your WSL machine without consuming Expo cloud build credits)_.

- **Build Development Client:**

  ```bash
  eas-build-android --profile development
  ```

- **Build Production Bundle (Google Play AAB):**
  ```bash
  eas-build-android --profile production
  ```

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](file:///home/berto/bert0ns-family-management/LICENSE).
