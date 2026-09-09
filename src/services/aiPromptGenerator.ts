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

export interface BankStatementPromptOptions {
  /**
   * List of available category names or category objects with descriptions.
   */
  categories: (string | PromptCategoryItem)[];
  /**
   * Preferred currency symbol (e.g. '€', 'EUR', '$'). Defaults to '€'.
   */
  currency?: string;
  /**
   * Optional household member names for automated payment attribution.
   */
  familyMembers?: string[];
  /**
   * Language for prompt guidance ('en' | 'it'). Defaults to 'en'.
   */
  language?: 'en' | 'it';
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
 * Normalizes input categories into unique formatted names.
 */
function normalizeCategories(categories: (string | PromptCategoryItem)[]): string[] {
  const names = categories
    .map((item) => (typeof item === 'string' ? item.trim() : item.name.trim()))
    .filter((name) => name.length > 0);

  const uniqueNames = Array.from(new Set(names));
  return uniqueNames.length > 0 ? uniqueNames : DEFAULT_CATEGORIES;
}

/**
 * Generates a precision AI prompt to extract expense data from bank PDF reports into JSON.
 */
export function generateBankStatementPrompt(options: BankStatementPromptOptions): string {
  const currency = options.currency || '€';
  const categoryList = normalizeCategories(options.categories);
  const members = (options.familyMembers || []).map((m) => m.trim()).filter((m) => m.length > 0);

  const formattedCategories = categoryList.map((cat) => `  - "${cat}"`).join('\n');

  const memberGuidance =
    members.length > 0
      ? `\n7. MEMBER ATTRIBUTION: If transaction cards, account numbers, or notes match any of the following household members: [${members.map((m) => `"${m}"`).join(', ')}], populate the "paid_by" field with their exact name.`
      : '';

  return `You are an expert financial document parser.
Analyze the attached bank/credit card statement PDF, extract all individual debit/expense transactions, and format them into the exact JSON structure defined below.

### EXTRACTION RULES:
1. EXPENSES ONLY: Extract ONLY debit / expense transactions.
   - EXCLUDE: Incoming credits, salaries, interest credits, refunds, internal transfers, opening/closing balance carryovers, and payments that pay off this credit card.
2. DATES: Format every transaction date strictly as "YYYY-MM-DD" (e.g. "2026-09-04").
3. AMOUNTS: Output amounts as positive decimal numbers with a period as decimal separator (e.g. 34.50). Never negative, never with currency symbols or thousands separators.
4. MERCHANT SANITIZATION: Clean up cryptic bank lines into recognizable merchant names:
   - Example: "POS 04/09 14.20 ESSELUNGA MILANO C.SO GENOVA N.0498230" -> "Esselunga"
   - Example: "RID ADDEBITO DIRETTO SEPA ENEL ENERGIA" -> "Enel Energia"
   - Example: "PAGAMENTO CARTA BANCOMAT TRENITALIA ROMA" -> "Trenitalia"
5. NOTES: Preserve the original raw statement description line in the "notes" field for reference.
6. CATEGORIZATION: Map each transaction strictly to the best matching category from this list:
${formattedCategories}${memberGuidance}
8. PAYMENT METHOD: Infer "Credit Card", "Debit Card", "Bank Transfer", "Direct Debit", or "Cash" where identifiable.

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
