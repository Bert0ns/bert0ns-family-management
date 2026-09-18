import { generateUUID, isValidUUID, generateInviteCode } from '@/utils/uuid';

describe('UUID and Invite Code Utilities', () => {
  it('generates valid RFC 4122 v4 UUIDs', () => {
    const uuid = generateUUID();
    expect(uuid).toBeDefined();
    expect(typeof uuid).toBe('string');
    expect(isValidUUID(uuid)).toBe(true);
  });

  it('generates unique UUIDs consecutively', () => {
    const uuids = new Set();
    for (let i = 0; i < 100; i++) {
      const id = generateUUID();
      expect(isValidUUID(id)).toBe(true);
      uuids.add(id);
    }
    expect(uuids.size).toBe(100);
  });

  it('uses fallback generator when globalThis.crypto.randomUUID is not available', () => {
    const originalCrypto = globalThis.crypto;
    try {
      // Temporarily remove randomUUID
      Object.defineProperty(globalThis, 'crypto', {
        value: undefined,
        writable: true,
        configurable: true,
      });

      const fallbackUuid = generateUUID();
      expect(typeof fallbackUuid).toBe('string');
      expect(isValidUUID(fallbackUuid)).toBe(true);
    } finally {
      Object.defineProperty(globalThis, 'crypto', {
        value: originalCrypto,
        writable: true,
        configurable: true,
      });
    }
  });

  it('validates UUID strings correctly', () => {
    expect(isValidUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
    expect(isValidUUID('c56a4180-65aa-42ec-a945-5fd2dececd05')).toBe(true);
    expect(isValidUUID('invalid-uuid')).toBe(false);
    expect(isValidUUID('')).toBe(false);
    // @ts-expect-error test non-string input
    expect(isValidUUID(null)).toBe(false);
    // @ts-expect-error test undefined input
    expect(isValidUUID(undefined)).toBe(false);
    // @ts-expect-error test numeric input
    expect(isValidUUID(12345)).toBe(false);
  });

  it('generates a clean 6-character uppercase invite code', () => {
    const code = generateInviteCode(6);
    expect(code).toHaveLength(6);
    expect(/^[A-Z2-9]{6}$/.test(code)).toBe(true);

    const defaultCode = generateInviteCode();
    expect(defaultCode).toHaveLength(6);
    expect(/^[A-Z2-9]{6}$/.test(defaultCode)).toBe(true);

    const longCode = generateInviteCode(10);
    expect(longCode).toHaveLength(10);
  });
});
