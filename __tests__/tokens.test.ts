import {
  DarkTheme,
  LightTheme,
  SeniorDarkTheme,
  SeniorLightTheme,
  SeniorTouchTargets,
  SeniorTypography,
  Palette,
  TouchTargets,
  Typography,
} from '@/theme/tokens';
import { getContrastRatio } from '@/utils/color';

describe('Design Tokens & WCAG AA / AAA Contrast', () => {
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

    it('updates textSecondary to #333D38 and textMuted to #475569 with high contrast (WCAG AAA)', () => {
      expect(LightTheme.colors.textSecondary).toBe('#333D38');
      expect(LightTheme.colors.textMuted).toBe('#475569');

      // textSecondary achieves > 7:1 WCAG AAA against surface (#FFFFFF) and background (#F4F5F2)
      const secAgainstWhite = getContrastRatio(LightTheme.colors.textSecondary, '#FFFFFF');
      expect(secAgainstWhite).toBeGreaterThanOrEqual(7.0);

      const secAgainstBg = getContrastRatio(
        LightTheme.colors.textSecondary,
        LightTheme.colors.background,
      );
      expect(secAgainstBg).toBeGreaterThanOrEqual(7.0);

      // textMuted achieves > 7:1 against white and >= 4.5:1 against canvas
      const mutedAgainstWhite = getContrastRatio(LightTheme.colors.textMuted, '#FFFFFF');
      expect(mutedAgainstWhite).toBeGreaterThanOrEqual(7.0);

      const mutedAgainstBg = getContrastRatio(
        LightTheme.colors.textMuted,
        LightTheme.colors.background,
      );
      expect(mutedAgainstBg).toBeGreaterThanOrEqual(4.5);
    });
  });

  describe('Senior Themes & High Contrast (WCAG AAA)', () => {
    it('SeniorLightTheme achieves WCAG AAA contrast ratio (>= 7:1) for textSecondary and textPrimary', () => {
      expect(SeniorLightTheme.colors.textPrimary).toBe('#000000');
      expect(SeniorLightTheme.colors.textSecondary).toBe('#1E293B');
      expect(SeniorLightTheme.colors.textMuted).toBe('#334155');
      expect(SeniorLightTheme.colors.border).toBe('#94A3B8');
      expect(SeniorLightTheme.colors.cardBorder).toBe('#94A3B8');
      expect(SeniorLightTheme.colors.borderTactile).toBe('#64748B');

      const secAgainstWhite = getContrastRatio(SeniorLightTheme.colors.textSecondary, '#FFFFFF');
      expect(secAgainstWhite).toBeGreaterThanOrEqual(7.0);

      const secAgainstBg = getContrastRatio(
        SeniorLightTheme.colors.textSecondary,
        SeniorLightTheme.colors.background,
      );
      expect(secAgainstBg).toBeGreaterThanOrEqual(7.0);

      const primaryAgainstWhite = getContrastRatio(SeniorLightTheme.colors.textPrimary, '#FFFFFF');
      expect(primaryAgainstWhite).toBeGreaterThanOrEqual(7.0);
    });

    it('SeniorDarkTheme achieves WCAG AAA contrast ratio (>= 7:1) for textSecondary and textPrimary', () => {
      expect(SeniorDarkTheme.colors.textPrimary).toBe('#FFFFFF');
      expect(SeniorDarkTheme.colors.textSecondary).toBe('#E2E8F0');
      expect(SeniorDarkTheme.colors.textMuted).toBe('#CBD5E1');
      expect(SeniorDarkTheme.colors.border).toBe('#475569');
      expect(SeniorDarkTheme.colors.cardBorder).toBe('#475569');
      expect(SeniorDarkTheme.colors.borderTactile).toBe('#64748B');

      const secAgainstSurface = getContrastRatio(
        SeniorDarkTheme.colors.textSecondary,
        SeniorDarkTheme.colors.surface,
      );
      expect(secAgainstSurface).toBeGreaterThanOrEqual(7.0);

      const secAgainstElevated = getContrastRatio(
        SeniorDarkTheme.colors.textSecondary,
        SeniorDarkTheme.colors.surfaceElevated,
      );
      expect(secAgainstElevated).toBeGreaterThanOrEqual(7.0);

      const secAgainstBg = getContrastRatio(
        SeniorDarkTheme.colors.textSecondary,
        SeniorDarkTheme.colors.background,
      );
      expect(secAgainstBg).toBeGreaterThanOrEqual(7.0);

      const primaryAgainstSurface = getContrastRatio(
        SeniorDarkTheme.colors.textPrimary,
        SeniorDarkTheme.colors.surface,
      );
      expect(primaryAgainstSurface).toBeGreaterThanOrEqual(7.0);
    });
  });

  describe('Touch Targets', () => {
    it('enforces standard minimum touch targets of at least 48px across all variants', () => {
      expect(TouchTargets.sm).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.md).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.lg).toBeGreaterThanOrEqual(48);
      expect(TouchTargets.xl).toBeGreaterThanOrEqual(48);
    });

    it('enforces senior touch targets with enlarged dimensions', () => {
      expect(SeniorTouchTargets.sm).toBe(54);
      expect(SeniorTouchTargets.md).toBe(62);
      expect(SeniorTouchTargets.lg).toBe(70);
      expect(SeniorTouchTargets.xl).toBe(78);

      expect(SeniorTouchTargets.sm).toBeGreaterThan(TouchTargets.sm);
      expect(SeniorTouchTargets.md).toBeGreaterThan(TouchTargets.md);
      expect(SeniorTouchTargets.lg).toBeGreaterThan(TouchTargets.lg);
      expect(SeniorTouchTargets.xl).toBeGreaterThan(TouchTargets.xl);
    });
  });

  describe('Typography & SeniorTypography', () => {
    it('sets Typography fontSizes with xs raised to 13 as a safer floor', () => {
      expect(Typography.fontSizes.xs).toBe(13);
      expect(Typography.fontSizes.hero).toBe(48);
    });

    it('provides scaled SeniorTypography font sizes and line heights', () => {
      expect(SeniorTypography.fontSizes.xs).toBe(15);
      expect(SeniorTypography.fontSizes.sm).toBe(16);
      expect(SeniorTypography.fontSizes.md).toBe(18);
      expect(SeniorTypography.fontSizes.lg).toBe(21);
      expect(SeniorTypography.fontSizes.xl).toBe(25);
      expect(SeniorTypography.fontSizes.xxl).toBe(30);
      expect(SeniorTypography.fontSizes.xxxl).toBe(36);
      expect(SeniorTypography.fontSizes.display).toBe(40);
      expect(SeniorTypography.fontSizes.giant).toBe(44);
      expect(SeniorTypography.fontSizes.hero).toBe(48);

      expect(SeniorTypography.lineHeights.tight).toBe(1.2);
      expect(SeniorTypography.lineHeights.snug).toBe(1.35);
      expect(SeniorTypography.lineHeights.normal).toBe(1.5);
      expect(SeniorTypography.lineHeights.relaxed).toBe(1.6);
      expect(SeniorTypography.lineHeights.loose).toBe(1.8);

      // Verify each senior font size is >= standard font size
      expect(SeniorTypography.fontSizes.xs).toBeGreaterThan(Typography.fontSizes.xs);
      expect(SeniorTypography.fontSizes.sm).toBeGreaterThan(Typography.fontSizes.sm);
      expect(SeniorTypography.fontSizes.md).toBeGreaterThan(Typography.fontSizes.md);
      expect(SeniorTypography.fontSizes.lg).toBeGreaterThan(Typography.fontSizes.lg);
      expect(SeniorTypography.fontSizes.xl).toBeGreaterThan(Typography.fontSizes.xl);
      expect(SeniorTypography.fontSizes.xxl).toBeGreaterThan(Typography.fontSizes.xxl);
      expect(SeniorTypography.fontSizes.xxxl).toBeGreaterThan(Typography.fontSizes.xxxl);
      expect(SeniorTypography.fontSizes.display).toBeGreaterThan(Typography.fontSizes.display);
    });
  });
});
