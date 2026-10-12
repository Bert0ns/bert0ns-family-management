import { DarkTheme, LightTheme, Palette, TouchTargets } from '@/theme/tokens';
import { getContrastRatio } from '@/utils/color';

describe('Design Tokens & WCAG AA Contrast', () => {
  describe('DarkTheme Color Contrast', () => {
    it('sets textMuted to Palette.neutral[400] (#94A3B8)', () => {
      expect(DarkTheme.colors.textMuted).toBe(Palette.neutral[400]);
      expect(DarkTheme.colors.textMuted).toBe('#94A3B8');
    });

    it('achieves at least 4.5:1 contrast ratio for textMuted against elevated card surface (WCAG AA)', () => {
      const ratio = getContrastRatio(DarkTheme.colors.textMuted, DarkTheme.colors.surfaceElevated);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
      // Specifically reaches 5.54:1 or greater
      expect(ratio).toBeGreaterThanOrEqual(5.0);
    });

    it('achieves at least 4.5:1 contrast ratio for textMuted against surface (WCAG AA)', () => {
      const ratio = getContrastRatio(DarkTheme.colors.textMuted, DarkTheme.colors.surface);
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('LightTheme Color Contrast', () => {
    it('sets warning to Palette.amber[700] (#B45309)', () => {
      expect(LightTheme.colors.warning).toBe(Palette.amber[700]);
      expect(LightTheme.colors.warning).toBe('#B45309');
    });

    it('achieves at least 4.5:1 contrast ratio for warning against white surface (WCAG AA)', () => {
      const ratio = getContrastRatio(LightTheme.colors.warning, '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });

    it('sets brand to Palette.emerald[700] (#047857)', () => {
      expect(LightTheme.colors.brand).toBe(Palette.emerald[700]);
      expect(LightTheme.colors.brand).toBe('#047857');
    });

    it('achieves at least 4.5:1 contrast ratio for brand against white surface (WCAG AA)', () => {
      const ratio = getContrastRatio(LightTheme.colors.brand, '#FFFFFF');
      expect(ratio).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Touch Targets', () => {
    it('enforces minimum touch targets of at least 48px across all variants', () => {
      expect(TouchTargets.sm).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.md).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.lg).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.xl).toBeGreaterThanOrEqual(48);
    });
  });
});
