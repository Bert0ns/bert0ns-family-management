import { TouchTargets, Typography } from '@/theme/tokens';

describe('Senior UI & Accessibility Remediation Tests (Partition 4)', () => {
  it('enforces senior accessibility minimum touch target sizes of at least 48px', () => {
    expect(TouchTargets.sm).toBeGreaterThanOrEqual(48);
    expect(TouchTargets.md).toBeGreaterThanOrEqual(56);
    expect(TouchTargets.lg).toBeGreaterThanOrEqual(64);
    expect(TouchTargets.xl).toBeGreaterThanOrEqual(72);
  });

  it('enforces senior-readable typography font scales', () => {
    expect(Typography.fontSizes.sm).toBeGreaterThanOrEqual(13);
    expect(Typography.fontSizes.md).toBeGreaterThanOrEqual(15);
    expect(Typography.fontSizes.lg).toBeGreaterThanOrEqual(17);
    expect(Typography.fontSizes.hero).toBe(48);
  });

  it('initials extraction helper handles empty, whitespace, and multi-word names safely', () => {
    const getInitials = (name?: string) => {
      const safeName = (name || '').trim();
      return safeName
        ? safeName
            .split(/\s+/)
            .map((part) => part[0])
            .filter(Boolean)
            .join('')
            .toUpperCase()
            .substring(0, 2)
        : '?';
    };

    expect(getInitials('')).toBe('?');
    expect(getInitials('   ')).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('Marco')).toBe('M');
    expect(getInitials('Marco Rossi')).toBe('MR');
    expect(getInitials('Maria De Rossi')).toBe('MD');
  });
});
