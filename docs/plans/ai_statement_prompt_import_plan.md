# 📋 Implementation Plan — AI Bank Statement Prompt & Direct JSON Import

## 1. Overview & Objective

Enable users to import expenses directly from bank PDF statements **without incurring any cloud API costs, subscription fees, or rate limits**, while maintaining 100% data privacy.

The solution provides:

1. **A Decoupled, Standalone AI Statement Prompt Generator**: A pure utility function that dynamically builds a specialized extraction prompt based on existing expense categories (and optional household parameters), completely decoupled from the UI, navigation, and store singletons.
2. **One-Tap Prompt Copying**: Allows the user to copy the prompt with one click, attach their bank statement PDF to any free AI tool (ChatGPT, Claude, Gemini Web, DeepSeek, or local Ollama), and receive structured JSON.
3. **Direct JSON Paste & Markdown Sanitization**: Allows users to paste the AI's output directly into the app (handling markdown code fences ` ```json ` automatically) without needing to download and save files on mobile.
4. **Seamless Ledger Staging**: Pipes the extracted data into the existing `reportValidator`, duplicate detector, and `ImportPreviewModal` before writing to the store.

---

## 2. Decoupled Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Core Domain (Decoupled & Standalone)
        Categories["Existing Categories: string[] | Category[]"]
        Options["Optional: Currency, Member Names, Language"]
        PromptService["generateBankStatementPrompt(options)"]
        Categories & Options --> PromptService
        PromptService --> PromptText["Customized AI Prompt String"]
    end

    subgraph External Free AI (User's Choice)
        PromptText --> PromptClipboard["Clipboard (User copies prompt)"]
        PromptClipboard --> ExternalAI["User pastes prompt + attaches PDF in ChatGPT / Claude / Gemini / Ollama"]
        ExternalAI --> AIOutput["AI generates structured JSON (or code-fenced markdown)"]
    end

    subgraph Ingestion & Sanitization
        AIOutput --> Ingest["App receives JSON (via File drop or Clipboard Paste)"]
        Ingest --> JsonExtractor["extractJsonPayload (strips markdown fences & text)"]
        JsonExtractor --> Validator["reportValidator (Zod Schema)"]
        Validator --> Staging["ImportPreviewModal with Duplicate Detection"]
        Staging --> Ledger["Ledger / Store commit"]
    end
```

---

## 3. Detailed Workstreams & Technical Specifications

### Workstream 1: Decoupled Dynamic Prompt Generator

- **File:** `src/services/aiPromptGenerator.ts`
- **Design Principles:**
  - **Zero Store / UI Coupling:** Pure function taking a generic options object (`PromptGenerationOptions`), returning a markdown/text string.
  - **Category-Driven:** Accepts string names or category objects; formats them cleanly as valid options for the AI classifier.
  - **Dynamic Injections:**
    - Categories: Injects current user categories so the AI maps merchants directly to existing budget envelopes.
    - Fallback: Includes sensible defaults (`Groceries`, `Utilities & Bills`, `Dining & Cafes`, `General & Other`) if empty.
    - Currency: Defaults to `€` / `EUR` or custom.
    - Household Members (Optional): Injects member names for automatic attribution (`paid_by`).
  - **Strict Extraction Guardrails:**
    - **Debits/Expenses only** (filters out incoming transfers, salaries, balance carryovers, credit card payment reconciliations).
    - **Date normalization** (`YYYY-MM-DD`).
    - **Merchant cleaning** (converts cryptic strings like `POS 12/03 ESSELUNGA MI` into `Esselunga`).
    - **Strict JSON schema** adhering to `RawExpenseReport`.

### Workstream 2: Robust AI JSON Sanitizer & Extractor

- **File:** `src/services/jsonExtractor.ts`
- **Responsibilities:**
  - LLMs often surround valid JSON with conversational greetings (`Here is your JSON:`) or markdown fences (` ```json ... ``` `).
  - Strip markdown fences, detect outer JSON object boundaries (`{ ... }`), and safely parse.
  - Provide human-friendly errors if the payload is malformed.

### Workstream 3: UI Enhancements on Import Screen

- **Files:**
  - `src/components/import/AiPromptCard.tsx`: Dedicated card explaining the 3-step workflow, showcasing the active category count, a 1-tap "Copy Prompt" button, and an expandable prompt preview modal.
  - `src/components/import/PasteJsonModal.tsx`: A modal enabling users on mobile/web to paste raw JSON text directly, preview transaction count, and import without saving a file to the device.
  - `src/components/import/JsonDropzone.tsx`: Add a secondary action button _"Or paste JSON text"_ alongside file selection.
  - `src/app/(tabs)/import.tsx`: Integrate `AiPromptCard` and `PasteJsonModal`.

### Workstream 4: Localization & Internationalization

- **Files:** `src/i18n/types.ts`, `src/i18n/en.ts`, `src/i18n/it.ts`
- Add complete translations for both English and Italian:
  - AI Bank Statement title, subtitles, step guides.
  - Prompt copied notice, paste JSON modal labels, error messages.

### Workstream 5: Comprehensive Testing & Validation

- **Files:**
  - `__tests__/aiPromptGenerator.test.ts`: Test dynamic category and member injection into prompt text, fallback behavior, and decoupled signature.
  - `__tests__/jsonExtractor.test.ts`: Test handling raw JSON, markdown-wrapped JSON, and conversational wrappers.
  - Existing suite verification: `pnpm check-all` (typecheck, lint, format:check, test).

---

## 4. Implementation Phasing

| Phase                           | Tasks                                                                         | Deliverables                                            |
| :------------------------------ | :---------------------------------------------------------------------------- | :------------------------------------------------------ |
| **Phase 1: Core Utilities**     | Implement `aiPromptGenerator.ts` and `jsonExtractor.ts` with unit tests       | `aiPromptGenerator.ts`, `jsonExtractor.ts`, test suites |
| **Phase 2: Localization**       | Add translation keys in `src/i18n/` for English and Italian                   | `en.ts`, `it.ts`, `types.ts`                            |
| **Phase 3: UI Components**      | Implement `AiPromptCard.tsx`, `PasteJsonModal.tsx`, update `JsonDropzone.tsx` | New reusable UI components                              |
| **Phase 4: Screen Integration** | Update `src/app/(tabs)/import.tsx` to showcase the workflow                   | Polished Import screen                                  |
| **Phase 5: Verification**       | Run `check-all`, manual QA with sample bank outputs                           | Zero warnings, 100% tests passing                       |
