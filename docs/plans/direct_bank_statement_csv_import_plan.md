# Implementation Plan: Direct Bank Statement CSV Import (Issue #14)

## Overview

Enable direct bank statement import from `.csv` files into the Import Hub (`src/app/(tabs)/import.tsx`), removing the need for external AI prompt conversion for standard bank exports. The feature provides an on-device, privacy-preserving CSV parsing engine (`src/services/csvParser.ts`) that automatically detects delimiters, maps headers across multiple banking formats (Intesa Sanpaolo, UniCredit, Revolut, Chase, etc.), normalizes European and US number/date formats, and feeds parsed transactions directly into the existing validation, duplicate-detection, and batch-import pipeline.

## Architecture Decisions

1. **Pure On-Device Domain Service (`src/services/csvParser.ts`)**:
   - Follows Single Responsibility Principle (SRP) and SOLID principles from `AGENTS.md`.
   - 100% client-side, zero network dependencies, preserving financial privacy.
   - RFC 4180 compliant CSV tokenizer handling quoted values, escaped quotes (`""`), and multiline fields without external heavy dependencies.
2. **Heuristic Header & Column Recognition**:
   - Case-insensitive dictionary matching for common banking headers in English and Italian (`Date`/`Data`/`Data contabile`, `Merchant`/`Descrizione`/`Beneficiario`/`Causale`, `Amount`/`Importo`/`Entrate`/`Uscite`).
   - Resilient fallback for signed amounts (e.g. debits represented as `-25.50` or `-25,50` converted to positive expense amounts).
3. **Locale-Agnostic Number & Date Parsing**:
   - Detect decimal comma (`1.250,50`) vs decimal dot (`1,250.50`).
   - Normalize dates (`YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, `DD-MM-YYYY`) to standard ISO `YYYY-MM-DD`.
4. **Seamless Integration with Existing Pipeline**:
   - Output structured `RawExpenseReport` validated via `reportValidator.validate()`.
   - Existing `ImportPreviewModal` and `duplicateDetector.checkBatchDuplicates` handle user review, duplicate badges, and confirmation.
   - Existing `useAppStore.importExpenseReport` handles batch persistence and outbox synchronization.

---

## Task List

### Phase 1: Foundation (CSV Parser Domain Service)

- [ ] **Task 1: RFC 4180 CSV Tokenizer & Delimiter Auto-Detection**
  - Create `src/services/csvParser.ts`.
  - Strip UTF-8 BOM (`\uFEFF`).
  - Auto-detect delimiter (comma `,`, semicolon `;`, tab `\t`) by frequency analysis on header rows.
  - Implement RFC 4180 streaming/row tokenizer handling quoted strings and escaped quotes.

- [ ] **Task 2: Multilingual Column Mapping, Number & Date Normalization**
  - Implement heuristic column detector for Date, Merchant/Description, Amount (including separate Debit/Credit columns), Category, and Payer.
  - Implement locale number parser supporting European (`1.250,50`) and US (`1,250.50`) formats, currency symbols, and signed values.
  - Implement date normalizer converting `YYYY-MM-DD`, `DD/MM/YYYY`, `MM/DD/YYYY`, and `DD-MM-YYYY` to ISO `YYYY-MM-DD`.
  - Construct and return `RawExpenseReport` validated through `reportValidator`.

### Checkpoint: Foundation & Unit Test Suite

- [ ] **Task 3: Comprehensive CSV Parser Unit Tests (`__tests__/csvParser.test.ts`)**
  - Write tests for popular bank statement formats:
    - Revolut (comma delimited, DD/MM/YYYY or YYYY-MM-DD, signed amount)
    - Intesa Sanpaolo (semicolon delimited, DD/MM/YYYY, Italian headers "Data", "Operazione", "Importo")
    - UniCredit (semicolon/comma, "Descrizione", Italian currency format `1.250,50`)
    - Standard US format (comma delimited, MM/DD/YYYY, decimal point)
  - Edge cases: UTF-8 BOM, multiline quoted descriptions, trailing empty lines, corrupted lines, injection sanitization.
  - Verification: `pnpm test __tests__/csvParser.test.ts` passes.

### Phase 2: UI & Ingestion Flow

- [ ] **Task 4: Extend Dropzone & Document Picker for CSV Ingestion**
  - Update `src/components/import/JsonDropzone.tsx` (or rename to unified `FileDropzone.tsx`) to accept `.csv` files as well as `.json`.
  - Extend `DocumentPicker.getDocumentAsync` MIME types (`['application/json', 'text/json', 'text/csv', 'text/comma-separated-values', 'application/vnd.ms-excel', 'text/plain']`).
  - Route based on file extension / content (`.csv` -> `csvParser`, `.json` -> `jsonExtractor`).
  - Update visual cues, icon badges, and dropzone labels to indicate CSV + JSON support.

- [ ] **Task 5: Localization & Import Screen Enhancements**
  - Update `src/i18n/types.ts`, `src/i18n/en.ts`, and `src/i18n/it.ts` with CSV upload instructions, supported formats, and error messages.
  - Update `src/app/(tabs)/import.tsx` bulk import card to mention direct CSV bank statement import.

### Checkpoint: End-to-End Verification

- [ ] **Task 6: Full Verification Suite**
  - Run `pnpm check-all` (TypeScript typecheck, ESLint, Prettier, and all Jest test suites).
  - Verify zero regressions and 100% test pass rate across all suites.

---

## Risks and Mitigations

| Risk                                                                           | Impact | Mitigation                                                                                                                                              |
| ------------------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Varied bank date formats (e.g. ambiguity between `01/02/2026` vs `02/01/2026`) | Medium | Check date components against day (>12 confirms day) and check statement period coherence; default to `DD/MM/YYYY` for European banks (`EUR` currency). |
| Number formatting with decimal comma vs dot                                    | Medium | Analyze punctuation pattern (e.g., presence of both `.` and `,` determines thousand vs decimal separator; single punctuation evaluated by context).     |
| Unrecognized headers from obscure banks                                        | Low    | Provide descriptive error message listing required columns if no date or amount header can be identified.                                               |
| CSV Injection (`=cmd                                                           | ...`)  | Low                                                                                                                                                     | Strip or escape formula prefix characters (`=`, `+`, `-`, `@`) when parsing textual values. |
