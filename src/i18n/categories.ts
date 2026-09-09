import { Category } from '@/types';
import { TranslationSchema } from './types';

export const CATEGORY_I18N_KEY_MAP: Record<string, keyof TranslationSchema['categories']> = {
  // Category IDs
  cat_groceries: 'groceries',
  cat_dining: 'dining',
  cat_utilities: 'utilities',
  cat_transport: 'transportation',
  cat_housing: 'housing',
  cat_healthcare: 'healthcare',
  cat_entertainment: 'entertainment',
  cat_shopping: 'shopping',
  cat_education: 'education',
  cat_other: 'other',
  cat_bank_related: 'bankRelated',

  // English fallback names (case-insensitive normalized)
  groceries: 'groceries',
  'dining & cafes': 'dining',
  dining: 'dining',
  'utilities & bills': 'utilities',
  utilities: 'utilities',
  bills: 'utilities',
  transportation: 'transportation',
  transport: 'transportation',
  'housing & rent': 'housing',
  housing: 'housing',
  rent: 'housing',
  'health & pharmacy': 'healthcare',
  health: 'healthcare',
  pharmacy: 'healthcare',
  entertainment: 'entertainment',
  'shopping & gear': 'shopping',
  shopping: 'shopping',
  'education & kids': 'education',
  education: 'education',
  'general & other': 'other',
  other: 'other',
  general: 'other',
  'bank related': 'bankRelated',
  bank: 'bankRelated',
  'bank expenses': 'bankRelated',

  // Italian names to handle pre-localized strings or user inputs
  'spesa alimentare': 'groceries',
  spesa: 'groceries',
  'ristoranti & bar': 'dining',
  'utenze & bollette': 'utilities',
  trasporti: 'transportation',
  'casa & affitto': 'housing',
  'salute & farmacia': 'healthcare',
  intrattenimento: 'entertainment',
  'shopping & acquisti': 'shopping',
  'istruzione & figli': 'education',
  'altro & generale': 'other',
  'spese bancarie': 'bankRelated',
};

export const PAYMENT_METHOD_I18N_KEY_MAP: Record<
  string,
  keyof TranslationSchema['paymentMethods']
> = {
  'credit card': 'creditCard',
  'carta di credito': 'creditCard',
  'bank transfer': 'bankTransfer',
  'bonifico bancario': 'bankTransfer',
  cash: 'cash',
  contanti: 'cash',
  'debit card': 'debitCard',
  'carta di debito': 'debitCard',
};

/**
 * Returns the localized category display name.
 * If the category is custom and not part of the standard set, its original name is preserved.
 */
export function getLocalizedCategoryName(
  category: Category | string | undefined | null,
  t: TranslationSchema,
): string {
  if (!category) return t.expenseDetail.uncategorized || 'Spesa';

  const catId = typeof category === 'string' ? category : category.id;
  const rawName = typeof category === 'string' ? category : category.name;

  // 1. Try mapping by ID
  if (catId && CATEGORY_I18N_KEY_MAP[catId.toLowerCase()]) {
    const key = CATEGORY_I18N_KEY_MAP[catId.toLowerCase()];
    return t.categories[key] || rawName;
  }

  // 2. Try mapping by normalized name
  if (rawName) {
    const normalized = rawName.trim().toLowerCase();
    if (CATEGORY_I18N_KEY_MAP[normalized]) {
      const key = CATEGORY_I18N_KEY_MAP[normalized];
      return t.categories[key] || rawName;
    }
    return rawName;
  }

  return t.expenseDetail.uncategorized || 'Spesa';
}

/**
 * Returns the localized payment method label.
 */
export function getLocalizedPaymentMethod(
  method: string | undefined | null,
  t: TranslationSchema,
): string {
  if (!method) return '';
  const normalized = method.trim().toLowerCase();
  const key = PAYMENT_METHOD_I18N_KEY_MAP[normalized];
  if (key && t.paymentMethods[key]) {
    return t.paymentMethods[key];
  }
  return method;
}
