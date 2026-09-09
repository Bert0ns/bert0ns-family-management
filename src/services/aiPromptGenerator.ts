/**
 * AI Statement Prompt Generator
 *
 * Standalone, decoupled utility that dynamically constructs a specialized financial
 * extraction prompt based on provided expense categories and optional household options.
 * Does not depend on UI, React state, or store singletons.
 */

export interface PromptCategoryItem {
  name: string;
  description?: string;
}

export interface NormalizedPromptCategory {
  name: string;
  description?: string;
}

export interface BankStatementPromptOptions {
  /**
   * List of available category names or category objects with descriptions.
   */
  categories: (string | PromptCategoryItem)[];
  /**
   * Supported EUR currency representation ('EUR' or '€'). Defaults to 'EUR'.
   * The app only supports EUR currency in the import schema.
   */
  currency?: 'EUR' | '€' | string;
  /**
   * Optional household member names for automated payment attribution.
   */
  familyMembers?: string[];
}

const DEFAULT_CATEGORIES = [
  'Groceries',
  'Utilities & Bills',
  'Housing & Rent',
  'Dining & Cafes',
  'Transport & Fuel',
  'Health & Pharmacy',
  'Entertainment',
  'Shopping & Gear',
  'Education & Kids',
  'Bank related',
  'General & Other',
];

/**
 * Normalizes input categories into unique formatted names and descriptions.
 * Performs case-insensitive deduplication and preserves optional descriptions.
 */
export function normalizeCategories(
  categories: (string | PromptCategoryItem)[],
): NormalizedPromptCategory[] {
  const map = new Map<string, NormalizedPromptCategory>();

  for (const item of categories) {
    const name = typeof item === 'string' ? item.trim() : item.name.trim();
    const description =
      typeof item !== 'string' && item.description ? item.description.trim() : undefined;

    if (name.length > 0 && !map.has(name.toLowerCase())) {
      map.set(name.toLowerCase(), { name, description });
    }
  }

  if (map.size === 0) {
    return DEFAULT_CATEGORIES.map((name) => ({ name }));
  }

  return Array.from(map.values());
}

/**
 * Generates a precision AI prompt to extract expense data from bank PDF reports into JSON.
 */
export function generateBankStatementPrompt(options: BankStatementPromptOptions): string {
  // The app strictly supports EUR ('EUR' or '€') in ExpenseReportImportSchema
  const currency = options.currency === '€' ? '€' : 'EUR';
  const categoryList = normalizeCategories(options.categories);
  const members = (options.familyMembers || []).map((m) => m.trim()).filter((m) => m.length > 0);

  const formattedCategories = categoryList
    .map((cat) =>
      cat.description ? `  - "${cat.name}" (${cat.description})` : `  - "${cat.name}"`,
    )
    .join('\n');

  const rules: string[] = [
    '1. EXPENSES ONLY: Extract ONLY debit / expense transactions.\n   - EXCLUDE: Incoming credits, salaries, interest credits, refunds, internal transfers, opening/closing balance carryovers, and payments that pay off this credit card.',
    '2. DATES: Format every transaction date strictly as "YYYY-MM-DD" (e.g. "2026-09-04").',
    '3. AMOUNTS: Output amounts as positive decimal numbers with a period as decimal separator (e.g. 34.50). Never negative, never with currency symbols or thousands separators.',
    '4. MERCHANT SANITIZATION: Clean up cryptic bank lines into recognizable merchant names:\n   - Example: "POS 04/09 14.20 ESSELUNGA MILANO C.SO GENOVA N.0498230" -> "Esselunga"\n   - Example: "RID ADDEBITO DIRETTO SEPA ENEL ENERGIA" -> "Enel Energia"\n   - Example: "PAGAMENTO CARTA BANCOMAT TRENITALIA ROMA" -> "Trenitalia"',
    '5. NOTES: Preserve the original raw statement description line in the "notes" field for reference.',
    `6. CATEGORIZATION: Map each transaction strictly to the best matching category from this list:\n${formattedCategories}`,
  ];

  if (members.length > 0) {
    rules.push(
      `7. MEMBER ATTRIBUTION: If transaction cards, account numbers, or notes match any of the following household members: [${members.map((m) => `"${m}"`).join(', ')}], populate the "paid_by" field with their exact name.`,
    );
    rules.push(
      '8. PAYMENT METHOD: Infer "Credit Card", "Debit Card", "Bank Transfer", "Direct Debit", or "Cash" where identifiable.',
    );
  } else {
    rules.push(
      '7. PAYMENT METHOD: Infer "Credit Card", "Debit Card", "Bank Transfer", "Direct Debit", or "Cash" where identifiable.',
    );
  }

  return `You are an expert financial document parser.
Analyze the attached bank/credit card statement PDF, extract all individual debit/expense transactions, and format them into the exact JSON structure defined below.

### EXTRACTION RULES:
${rules.join('\n')}

### OUTPUT SPECIFICATION:
Return ONLY a valid, parseable JSON object matching this schema (do not wrap in markdown code blocks, and do not include conversational preamble or closing notes):

{
  "report_title": "Bank Statement [Month Year]",
  "currency": "${currency}",
  "expenses": [
    {
      "date": "YYYY-MM-DD",
      "merchant": "Clean Merchant Name",
      "amount": 42.50,
      "category": "Matching Category Name",
      "notes": "Original raw bank line description",
      "payment_method": "Debit Card",
      "is_recurring": false
    }
  ]
}`;
}
