import { en as enDict } from '@/i18n/en';
import { it as itDict } from '@/i18n/it';
import { getLocalizedCategoryName, getLocalizedPaymentMethod } from '@/i18n/categories';
import { INITIAL_CATEGORIES } from '@/data/mockData';

describe('Internationalization & Dictionaries (Parity & Completeness Tests)', () => {
  function getAllKeyPaths(obj: Record<string, any>, prefix = ''): string[] {
    let keys: string[] = [];
    for (const key of Object.keys(obj)) {
      const fullPath = prefix ? `${prefix}.${key}` : key;
      if (typeof obj[key] === 'object' && obj[key] !== null) {
        keys = keys.concat(getAllKeyPaths(obj[key], fullPath));
      } else {
        keys.push(fullPath);
      }
    }
    return keys;
  }

  function getNestedValue(obj: Record<string, any>, path: string): any {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  }

  // Exact test name requested by the user
  it('checks that for each localized key there exists both an italian and english version', () => {
    const enKeys = getAllKeyPaths(enDict).sort();
    const itKeys = getAllKeyPaths(itDict).sort();

    // Check all English keys exist in Italian
    const missingInIt = enKeys.filter((k) => getNestedValue(itDict, k) === undefined);
    expect(missingInIt).toEqual([]);

    // Check all Italian keys exist in English
    const missingInEn = itKeys.filter((k) => getNestedValue(enDict, k) === undefined);
    expect(missingInEn).toEqual([]);

    // Check symmetrical length
    expect(enKeys).toEqual(itKeys);
  });

  it('contains non-empty translation strings for every single key in both languages', () => {
    const checkNonEmpty = (obj: Record<string, any>, lang: string, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const fullPath = path ? `${path}.${key}` : key;
        if (typeof value === 'object' && value !== null) {
          checkNonEmpty(value, lang, fullPath);
        } else {
          expect(typeof value).toBe('string');
          expect((value as string).trim().length).toBeGreaterThan(0);
        }
      }
    };

    checkNonEmpty(enDict, 'en');
    checkNonEmpty(itDict, 'it');
  });

  it('includes the "Bank related" expense label in both English and Italian', () => {
    expect(enDict.categories.bankRelated).toBe('Bank related');
    expect(itDict.categories.bankRelated).toBe('Spese Bancarie');

    // Test with category object
    const bankCategory = INITIAL_CATEGORIES.find((c) => c.id === 'cat_bank_related');
    expect(bankCategory).toBeDefined();
    expect(bankCategory?.name).toBe('Bank related');

    const enName = getLocalizedCategoryName(bankCategory, enDict);
    const itName = getLocalizedCategoryName(bankCategory, itDict);

    expect(enName).toBe('Bank related');
    expect(itName).toBe('Spese Bancarie');
  });

  it('localizes all initial expense categories in both English and Italian without missing labels', () => {
    expect(INITIAL_CATEGORIES.length).toBeGreaterThan(0);

    for (const cat of INITIAL_CATEGORIES) {
      const enLabel = getLocalizedCategoryName(cat, enDict);
      const itLabel = getLocalizedCategoryName(cat, itDict);

      expect(typeof enLabel).toBe('string');
      expect(enLabel.trim().length).toBeGreaterThan(0);
      expect(typeof itLabel).toBe('string');
      expect(itLabel.trim().length).toBeGreaterThan(0);

      // Verify it's not falling back to an unhandled ID
      expect(enLabel).not.toBe(cat.id);
      expect(itLabel).not.toBe(cat.id);
    }
  });

  it('handles category localization edge cases (null, empty, custom, and ID strings)', () => {
    // Null and undefined
    expect(getLocalizedCategoryName(null, enDict)).toBe(enDict.expenseDetail.uncategorized);
    expect(getLocalizedCategoryName(undefined, itDict)).toBe(itDict.expenseDetail.uncategorized);

    // Empty object without id or name
    expect(getLocalizedCategoryName({} as any, enDict)).toBe(enDict.expenseDetail.uncategorized);

    // Category passed as string ID
    expect(getLocalizedCategoryName('cat_groceries', enDict)).toBe('Groceries');
    expect(getLocalizedCategoryName('cat_groceries', itDict)).toBe('Spesa Alimentare');

    // Category passed as string name normalized (key map matches name)
    expect(getLocalizedCategoryName('groceries', itDict)).toBe('Spesa Alimentare');

    // Category object with unknown ID but recognized name
    expect(
      getLocalizedCategoryName({ id: 'custom_legacy_1', name: 'Housing & Rent' } as any, itDict),
    ).toBe('Casa & Affitto');

    // Category fallback when dictionary key is empty string
    const incompleteDict = {
      ...enDict,
      categories: {
        ...enDict.categories,
        housing: '',
      },
    };
    expect(
      getLocalizedCategoryName(
        { id: 'cat_custom', name: 'Housing & Rent' } as any,
        incompleteDict as any,
      ),
    ).toBe('Housing & Rent');

    // Custom non-standard category returns its raw name
    expect(getLocalizedCategoryName('Custom Hobby Equipment', enDict)).toBe(
      'Custom Hobby Equipment',
    );
    expect(
      getLocalizedCategoryName(
        { id: 'cat_custom_hobby', name: 'Custom Hobby Equipment' } as any,
        itDict,
      ),
    ).toBe('Custom Hobby Equipment');
  });

  it('localizes payment methods in both English and Italian', () => {
    const methods = ['Credit Card', 'Cash', 'Bank Transfer', 'Debit Card'];

    for (const method of methods) {
      const enMethod = getLocalizedPaymentMethod(method, enDict);
      const itMethod = getLocalizedPaymentMethod(method, itDict);

      expect(typeof enMethod).toBe('string');
      expect(enMethod.trim().length).toBeGreaterThan(0);
      expect(typeof itMethod).toBe('string');
      expect(itMethod.trim().length).toBeGreaterThan(0);
    }

    expect(getLocalizedPaymentMethod('Credit Card', enDict)).toBe('Credit Card');
    expect(getLocalizedPaymentMethod('Credit Card', itDict)).toBe('Carta di Credito');
    expect(getLocalizedPaymentMethod('Bank Transfer', itDict)).toBe('Bonifico Bancario');
    expect(getLocalizedPaymentMethod('Cash', itDict)).toBe('Contanti');

    // Edge cases: null, undefined, empty, unknown
    expect(getLocalizedPaymentMethod(null, enDict)).toBe('');
    expect(getLocalizedPaymentMethod(undefined, itDict)).toBe('');
    expect(getLocalizedPaymentMethod('', enDict)).toBe('');
    expect(getLocalizedPaymentMethod('Cryptocurrency', enDict)).toBe('Cryptocurrency');
  });

  it('translates main tab routes accurately', () => {
    expect(enDict.tabs.dashboard).toBe('Dashboard');
    expect(itDict.tabs.dashboard).toBe('Panoramica');

    expect(enDict.tabs.analytics).toBe('Analytics');
    expect(itDict.tabs.analytics).toBe('Analisi');

    expect(enDict.tabs.ledger).toBe('Ledger');
    expect(itDict.tabs.ledger).toBe('Registro');

    expect(enDict.tabs.family).toBe('Family');
    expect(itDict.tabs.family).toBe('Famiglia');
  });
});
