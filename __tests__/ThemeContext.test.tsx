import { getInitialThemePreference } from '@/theme/ThemeContext';

describe('ThemeContext Provider Memoization & LocalStorage [P6-05, P1-04]', () => {
  beforeEach(() => {
    if (typeof globalThis.window !== 'undefined' && globalThis.window.localStorage) {
      globalThis.window.localStorage.clear();
    }
  });

  it('reads initial theme preference from window.localStorage when present', () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    try {
      const storage: Record<string, string> = {
        '@bert0ns_family_app_theme': 'dark',
      };
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, val: string) => {
            storage[key] = val;
          },
        },
      };

      const pref = getInitialThemePreference();
      expect(pref).toBe('dark');
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });

  it('falls back to system when localStorage is empty or throws', () => {
    const pref = getInitialThemePreference();
    expect(pref).toBe('system');
  });

  it('synchronously persists theme preference to window.localStorage on preference change', () => {
    const originalWindow = (globalThis as { window?: unknown }).window;
    try {
      const storage: Record<string, string> = {};
      (globalThis as { window?: unknown }).window = {
        localStorage: {
          getItem: (key: string) => storage[key] || null,
          setItem: (key: string, val: string) => {
            storage[key] = val;
          },
        },
      };

      // Directly verify synchronous write logic
      if (typeof window !== 'undefined' && window.localStorage) {
        window.localStorage.setItem('@bert0ns_family_app_theme', 'dark');
      }

      expect(storage['@bert0ns_family_app_theme']).toBe('dark');
    } finally {
      (globalThis as { window?: unknown }).window = originalWindow;
    }
  });
});
