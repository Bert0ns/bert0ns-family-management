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

| Field              | Type     |   Required   | Description                                                           |
| :----------------- | :------- | :----------: | :-------------------------------------------------------------------- |
| `report_title`     | `string` |   Optional   | Title of the statement or export batch                                |
| `currency`         | `string` |   Optional   | Currency symbol or code (strictly `"EUR"` or `"€"`, default: `"EUR"`) |
| `statement_period` | `object` |   Optional   | `{ start_date?: "YYYY-MM-DD", end_date?: "YYYY-MM-DD" }`              |
| `uploaded_by`      | `string` |   Optional   | Name of the uploader                                                  |
| `expenses`         | `array`  | **Required** | Array of expense objects (minimum 1 item)                             |

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
family-management/
├── .github/workflows/          # Automated GitHub Actions
│   ├── ci.yml                  # PR & merge quality checks (tsc, lint, prettier, jest)
│   ├── build-android-apk.yml   # Native GitHub Actions APK compilation & artifact upload
│   └── supabase-keepalive.yml  # Scheduled cron ping preventing free-tier inactivity pause
├── __tests__/                  # 17 Unit & integration test suites (99 tests, 100% pass)
│   ├── analytics.test.ts       # KPI, burn rate, velocity, and heatmap tests
│   ├── authService.test.ts     # Supabase authentication & session handling tests
│   ├── business_logic_remediation.test.ts # Business logic remediation edge-case tests
│   ├── csvExporter.test.ts     # CSV generation & escape tests
│   ├── duplicateDetector.test.ts # Duplicate transaction detection tests
│   ├── i18n.test.ts            # Dictionary parity & completeness tests
│   ├── logger.test.ts          # Scoped logger & trace level tests
│   ├── migrationService.test.ts # Schema migration & versioning tests
│   ├── realtimeSync.test.ts    # Supabase Realtime broadcast & delta sync tests
│   ├── splitCalculator.test.ts # Remainder-exact split math tests
│   ├── store.test.ts           # State mutations, persistence & CRUD tests
│   ├── store_remediation.test.ts # State recovery & atomic transition tests
│   ├── syncEngine.test.ts      # Cloud synchronization & offline queue tests
│   ├── sync_remediation.test.ts # Conflict resolution & delta replay tests
│   ├── ui_remediation.test.ts  # Component rendering & accessibility tests
│   ├── uuid.test.ts            # Cryptographically secure UUID generator tests
│   └── validator.test.ts       # Zod JSON schema validation tests
├── src/
│   ├── app/                    # Expo Router screens & navigation
│   │   ├── (tabs)/
│   │   │   ├── _layout.tsx     # 5-tab navigation layout + import route
│   │   │   ├── index.tsx       # Dashboard overview & quick actions
│   │   │   ├── analytics.tsx   # Visual charts & trend tabs
│   │   │   ├── ledger.tsx      # Filterable transaction ledger
│   │   │   ├── import.tsx      # JSON dropzone & CSV export
│   │   │   ├── family.tsx      # Household members & custom categories
│   │   │   └── settings.tsx    # Preferences, currency, themes, cloud sync & data reset
│   │   └── expense/
│   │       └── add.tsx         # Add expense modal screen
│   ├── components/
│   │   ├── charts/             # CategoryPieChart, MemberBarChart, SpendingVelocityChart, HeatmapCalendar, SettlementCard
│   │   ├── common/             # Button, Card, Avatar, Badge, KPIStat, OptionSelector, FormModal, IconHelper, Input, PeriodSelector, SyncBadge
│   │   ├── family/             # MemberCard, AddMemberModal, EditMemberModal, AddCategoryModal
│   │   ├── import/             # JsonDropzone, ImportPreviewModal, SchemaViewer
│   │   ├── ledger/             # ExpenseItem, ExpenseDetailModal, SplitCalculator
│   │   └── sync/               # AuthModal (OTP login), FamilyPairingModal (household code sharing)
│   ├── data/                   # Mock seed data & Supabase SQL schema
│   ├── i18n/                   # Typed translation dictionaries (EN & IT), categories & context
│   ├── services/               # Analytics, Split, Duplicate, Sync, Realtime, Auth, Logger, Store, Migration
│   ├── theme/                  # Design tokens (colors, spacing, typography, radii) & ThemeContext
│   ├── types/                  # Core domain models & Zod schemas
│   └── utils/                  # Cryptographic UUID generator
├── AGENTS.md                   # Agent & Contributor engineering standards (SOLID principles)
├── eas.json                    # Local WSL and standalone APK build profile
├── package.json                # Project dependencies & pnpm configuration
└── vercel.json                 # Web / PWA deployment configuration
```

---

## 🚀 Getting Started

### Prerequisites

- **Node.js**: v18+ or v20+
- **pnpm**: v9+ (`npm install -g pnpm`)\n\n> **Note**: This repository is configured strictly for `pnpm`. Please use `pnpm` exclusively to avoid package dependency conflicts.

### Installation

```bash
# Clone the repository
git clone https://github.com/Bert0ns/family-management.git
cd family-management

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
# Run all quality checks (typecheck + lint + format:check + test)
pnpm check-all

# Run all 17 Jest test suites with coverage report
pnpm test --coverage

# Run strict TypeScript typecheck
pnpm typecheck

# Lint codebase with ESLint
pnpm lint

# Format code with Prettier
pnpm format

# Production Web / PWA Export
pnpm build:web

# Build standalone Android APK locally in WSL (free, no cloud tokens needed)
pnpm build:apk:local
```

---

## 🔒 Security & Privacy

- **Zero Cloud AI**: No financial records leave the device for external machine learning or LLM processing.
- **Local-First**: Works 100% offline out-of-the-box.
- **Optional Supabase Cloud Sync**: Pre-configured with PostgreSQL Row-Level Security (`RLS`) schema in [`src/data/supabase_schema.sql`](src/data/supabase_schema.sql), guaranteeing tenant isolation between families if cloud sync is activated.

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

## 🚀 Release Workflow & Distribution

The repository features a fully automated release pipeline in [`.github/workflows/release.yml`](.github/workflows/release.yml) that executes quality validation, compiles standalone native Android APKs and static Web bundles, generates SHA-256 checksums, and publishes official GitHub Releases with auto-generated release notes.

### Releasing via CLI (Recommended)

Run the interactive release script:

```bash
pnpm release
```

This helper will:

1. Ensure your git working tree is clean and that you are on `main`, in sync with `origin/main`.
2. Prompt for bump type (`patch`, `minor`, `major`, or custom version).
3. Run the complete quality suite (`pnpm check-all`).
4. Synchronize version strings in both `package.json` and `app.json`, and increment the Android `versionCode`.
5. Create an annotated git commit and release tag (e.g. `v1.0.1`).
6. Prompt to push `main` and the release tag to GitHub, immediately triggering the release pipeline.

### Releasing via Git Tag Push

You can also trigger a release manually by creating and pushing a semantic version tag. The tag must match the version in `package.json` and `app.json`, otherwise the pipeline fails:

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

### Manual Trigger via GitHub Actions (workflow_dispatch)

Navigate to **Actions** → **Release Application** → **Run workflow** (from `main` only). The release is tagged `v<version>` using the version in `package.json`:

- **Draft / Pre-release**: Toggle draft or pre-release flags.
- **Build Targets**: Selectively build Android APK and/or Web bundle.
- **Emergency Bypass**: Optionally skip validation checks in emergency rollback/hotfix scenarios.

### Android Release Signing

Release APKs are signed with the project's private release key, never the public debug key. The pipeline refuses to build Android releases unless these repository secrets are set:

| Secret                              | Value                                |
| ----------------------------------- | ------------------------------------ |
| `ANDROID_RELEASE_KEYSTORE_BASE64`   | `base64 -w0 release.keystore` output |
| `ANDROID_RELEASE_KEYSTORE_PASSWORD` | Keystore password                    |
| `ANDROID_RELEASE_KEY_ALIAS`         | Key alias inside the keystore        |
| `ANDROID_RELEASE_KEY_PASSWORD`      | Key password                         |

Generate a keystore once and back it up safely; losing it means existing installs can no longer be updated:

```bash
keytool -genkeypair -v -keystore release.keystore -alias family-release \
  -keyalg RSA -keysize 4096 -validity 10000
```

### Release Artifacts Published

Every release generates and attaches the following assets to GitHub Releases:

- `FamilyExpenseManager-<version>.apk`: Standalone release APK ready for direct sideloading and distribution to relatives.
- `FamilyExpenseManager-web-<version>.zip`: Production web distribution bundle.
- `SHA256SUMS.txt`: Cryptographic SHA-256 checksums for verifying file integrity.

---

## 📄 License

This project is licensed under the [GNU Affero General Public License v3.0 (AGPL-3.0)](LICENSE).
