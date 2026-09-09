# AGENTS.md — Agent & Contributor Engineering Guidelines

> **Notice on Expo Framework**:  
> Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing or updating platform and navigation code. Always adhere to Expo SDK 57 idioms and current React Native patterns.

---

## 1. Project Mission & Core Vision

This project is a **cross-platform, privacy-first family financial management and expense analytics application** built with React Native, Expo, and TypeScript.

Key domain characteristics:

- **Local-First & Offline-Capable**: The application must function reliably offline. Data is stored locally on-device and may sync to a remote backend (e.g., PostgreSQL/Supabase) when connected.
- **Financial Precision & Integrity**: Household ledgers, splits, and currency calculations require exactness. Rounding drift, dropped pennies, and floating-point errors are strictly unacceptable.
- **Strict Data Privacy**: User financial records are confidential. No financial payloads or transaction histories should ever be sent to third-party telemetry, logging, or non-deterministic AI evaluation endpoints.
- **Cross-Platform Consistency**: The codebase targets Mobile (iOS, Android) and Web from a single TypeScript foundation.

---

## 2. SOLID Architectural Principles

Every contribution must embody the SOLID principles tailored to TypeScript and React Native architecture:

### S — Single Responsibility Principle (SRP)

- **UI Components** must only handle layout, visual rendering, and dispatching user actions. They must not contain mathematical calculations, business aggregations, or direct network/storage calls.
- **Custom Hooks** manage view-level state, subscriptions, and presentation-level side effects. They coordinate between UI and domain services without embedding business calculation algorithms.
- **Domain Services** perform business calculations (e.g., metric aggregation, expense splitting, duplicate detection, formatting) and nothing else.
- **Adapters & Repositories** isolate persistence, file I/O, or network synchronization from business logic.

### O — Open/Closed Principle (OCP)

- Core workflows must be **open for extension, closed for modification**.
- Use strategy objects, polymorphism, or configuration-driven processors rather than sprawling `switch` or nested `if-else` blocks (e.g., for different export formats, split calculation strategies, or import parsers).
- Adding a new category, export format, or chart type should require adding a new implementation module or configuration entry without mutating core orchestration logic.

### L — Liskov Substitution Principle (LSP)

- Implementations of a contract or interface must be swappable without breaking client expectations.
- Storage backends (in-memory test stores vs. local key-value storage vs. remote synchronized stores) must honor identical contractual guarantees (error handling, nullability, idempotency).
- Never throw unexpected runtime errors from an implementation if the interface contract does not account for them.

### I — Interface Segregation Principle (ISP)

- Favor small, focused, cohesive interfaces over monolithic "god" interfaces.
- Clients should not be forced to depend on methods or properties they do not use.
- Prefer segregating read vs. write contracts, or isolating specific analytical capabilities into dedicated interfaces (e.g., `ISplitCalculator`, `IReportValidator`, `IExpenseReader`).

### D — Dependency Inversion Principle (DIP)

- High-level business rules (calculators, aggregators, ledger rules) must never depend directly on low-level infrastructure modules (file systems, network clients, platform-specific APIs, direct UI stores).
- Both high-level and low-level modules must depend on **abstractions** (interfaces or type contracts).
- Inject dependencies or expose composable pure functions rather than accessing global concrete singletons inside business logic.

---

## 3. Architecture & Separation of Concerns

Organize code cleanly across distinct architectural layers:

```
┌─────────────────────────────────────────────────────────────┐
│ Presentation Layer (Screens, Components, Modals)            │
│ └── Pure UI rendering, Theme tokens, User interactions      │
├─────────────────────────────────────────────────────────────┤
│ Application / Presentation Adapters (Hooks & Store Facades) │
│ └── State binding, Event handlers, UI-state composition     │
├─────────────────────────────────────────────────────────────┤
│ Domain / Business Logic (Pure Services & Calculators)        │
│ └── Financial math, Splitting algorithms, KPIs, Analytics   │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure Layer (Adapters, Persistence, Sync, Network) │
│ └── Local storage, Cloud synchronization, File system, I/O  │
├─────────────────────────────────────────────────────────────┤
│ Contracts & Types (Domain Entities, Schemas, Interfaces)    │
│ └── Zod schemas, TypeScript types, Repository interfaces    │
└─────────────────────────────────────────────────────────────┘
```

### Layer Constraints

1. **Domain Logic Must Be Pure & Framework-Agnostic**:
   - Services calculating metrics, ledger totals, or duplicate detections must be deterministic pure functions or stateless classes.
   - Do not import `react`, `react-native`, or platform APIs into domain calculation services.
2. **Boundary Validation ("Parse, Don't Validate")**:
   - Treat all external input (file imports, local storage payloads, API responses, deep links) as untrusted.
   - Enforce schema validation at boundaries using runtime schemas (e.g., Zod). Once validated, trust the domain types internally.
3. **Platform Independence**:
   - Abstract native capabilities (document picker, file system, haptics, sharing) behind common interfaces or modular adapters.
   - Never break Web compatibility when implementing native mobile functionality.

---

## 4. Financial & Data Engineering Rules

1. **Cent-Exact Monetary Math**:
   - Floating-point calculations can introduce precision errors (`0.1 + 0.2 !== 0.3`).
   - Use integer arithmetic (working in minor units / cents) or exact remainder-allocation algorithms for splits and aggregations.
   - Rounding remainders must be distributed deterministically so that the sum of splits equals the exact total transaction amount.
2. **Immutability**:
   - Treat state and domain entities as immutable.
   - Never mutate parameters in calculation functions; return new object/array references.
3. **Deterministic Timestamps & Dates**:
   - Use explicit date representations (ISO 8601 or `YYYY-MM-DD` strings) for financial entries.
   - Avoid relying on ambient timezone assumptions or uncontrolled `new Date()` calls inside pure domain algorithms; allow reference dates to be injected.

---

## 5. Coding Standards & TypeScript Discipline

- **Strict Type Safety**:
  - Strict compiler checks (`noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noImplicitOverride`, `forceConsistentCasingInFileNames`) are enabled in `tsconfig.json`.
  - `noImplicitAny` is strictly enforced. Avoid `any` at all costs. Use `unknown` with type guards or schema parsers when dealing with raw inputs.
  - Use discriminated unions for modeling lifecycle states, operation results, and variant types.
- **Explicit Returns & Contracts**:
  - Exported functions and public interface methods should specify explicit return types.
- **Fail Gracefully with Actionable Messages**:
  - Provide meaningful error messages for validation and synchronization failures. Do not swallow errors silently.
- **Maintainable Design Tokens**:
  - Component styling should consume design system tokens (colors, spacing, typography, radii) rather than arbitrary magic numbers. Support dynamic theming (light/dark) seamlessly.

---

## 6. Testing & Verification Standards

Quality in this project is verified systematically through automated pre-commit gates and targeted tests:

1. **Automated Pre-Commit Quality Gate**:
   - Strict type safety (`pnpm typecheck`), linting (`eslint --fix --no-warn-ignored --max-warnings=0`), and formatting (`prettier --write`) are automatically enforced at the git commit phase via Husky and lint-staged.
   - **Do not run redundant check commands**: There is no need to manually invoke repetitive `typecheck`, `lint`, or `format` commands multiple times during editing sessions. Staged changes are validated and formatted automatically upon committing.
2. **Unit Test Coverage for Domain Logic**:
   - All financial calculators, duplicate detectors, validators, and exporters must maintain comprehensive unit test suites covering edge cases (zero values, negative numbers, leap years, rounding remainders, empty arrays).
   - Run `pnpm test` (or targeted test files with `pnpm test <filename>`) when modifying business logic or financial calculations.
3. **Single Full Verification**:
   - If full end-to-end verification is desired before pushing, use `pnpm check-all` once rather than invoking individual scripts repeatedly.
4. **Avoid Fragile Mocking**:
   - Because business logic is decoupled from infrastructure, test domain services directly with plain input objects rather than elaborate mocks.

---

## 7. Agent Operational Protocol

When working on this repository, agents must adhere to the following workflow:

1. **Context Assessment**: Understand the relevant architectural layer before modifying code. Ask: _Is this domain logic, infrastructure, state orchestration, or UI presentation?_
2. **Minimal & Cohesive Changes**: Solve the user request with focused edits. Avoid sweeping refactors or unnecessary package additions unless explicitly requested.
3. **Respect Existing Patterns**: Follow the established directory layout, naming conventions, and interface definitions.
4. **Streamlined Verification**:
   - Do not call redundant typecheck/lint/format commands repeatedly. Trust the pre-commit hook (Husky + lint-staged) which automatically runs `pnpm typecheck`, ESLint, and Prettier on `git commit`.
   - Run `pnpm test` only when changing functional logic or updating test suites.
