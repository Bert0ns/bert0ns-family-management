import { en as enDict } from '@/i18n/en';
import { it as itDict } from '@/i18n/it';

describe('Internationalization & Dictionaries (Unit Tests)', () => {
  function compareKeys(obj1: Record<string, any>, obj2: Record<string, any>, path = ''): string[] {
    const missing: string[] = [];

    for (const key of Object.keys(obj1)) {
      const currentPath = path ? `${path}.${key}` : key;
      if (!(key in obj2)) {
        missing.push(`Missing key: ${currentPath}`);
      } else if (typeof obj1[key] === 'object' && obj1[key] !== null) {
        missing.push(...compareKeys(obj1[key], obj2[key], currentPath));
      }
    }

    return missing;
  }

  it('has identical keys in both English and Italian dictionaries', () => {
    const missingInIt = compareKeys(enDict, itDict);
    const missingInEn = compareKeys(itDict, enDict);

    expect(missingInIt).toEqual([]);
    expect(missingInEn).toEqual([]);
  });

  it('contains non-empty translation strings for all values', () => {
    const checkNonEmpty = (obj: Record<string, any>) => {
      for (const [, value] of Object.entries(obj)) {
        if (typeof value === 'object' && value !== null) {
          checkNonEmpty(value);
        } else {
          expect(typeof value).toBe('string');
          expect((value as string).trim().length).toBeGreaterThan(0);
        }
      }
    };

    checkNonEmpty(enDict);
    checkNonEmpty(itDict);
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
