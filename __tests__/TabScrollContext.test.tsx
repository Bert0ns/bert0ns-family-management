import {
  shouldShowTabLabels,
  SCROLL_THRESHOLD,
  useTabScroll,
  TabScrollContext,
} from '@/context/TabScrollContext';
import { Animated } from 'react-native';

describe('TabScrollContext', () => {
  describe('shouldShowTabLabels', () => {
    it('has SCROLL_THRESHOLD equal to 24', () => {
      expect(SCROLL_THRESHOLD).toBe(24);
    });

    it('returns true for negative scrollY (iOS bounce, e.g. -10)', () => {
      expect(shouldShowTabLabels(-10)).toBe(true);
    });

    it('returns true for scrollY = 0', () => {
      expect(shouldShowTabLabels(0)).toBe(true);
    });

    it('returns true for scrollY = 24 (at threshold)', () => {
      expect(shouldShowTabLabels(24)).toBe(true);
    });

    it('returns false for scrollY = 25 (above threshold)', () => {
      expect(shouldShowTabLabels(25)).toBe(false);
    });

    it('returns false for scrollY = 120 (scrolled down)', () => {
      expect(shouldShowTabLabels(120)).toBe(false);
    });

    it('supports custom threshold parameter', () => {
      expect(shouldShowTabLabels(30, 30)).toBe(true);
      expect(shouldShowTabLabels(31, 30)).toBe(false);
      expect(shouldShowTabLabels(-5, 10)).toBe(true);
      expect(shouldShowTabLabels(10, 10)).toBe(true);
      expect(shouldShowTabLabels(11, 10)).toBe(false);
    });
  });

  describe('useTabScroll safe defaults', () => {
    it('returns safe fallback values when used outside TabScrollProvider', () => {
      const spy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const fallback = useTabScroll();
      spy.mockRestore();

      expect(fallback.isAtTop).toBe(true);
      expect(fallback.labelsVisibility).toBeInstanceOf(Animated.Value);
      expect(typeof fallback.handleTabScroll).toBe('function');
      expect(typeof fallback.resetTabScroll).toBe('function');

      // Calling fallbacks should not throw
      expect(() => {
        fallback.handleTabScroll({ nativeEvent: { contentOffset: { y: 100 } } });
        fallback.resetTabScroll();
      }).not.toThrow();
    });

    it('provides context object and defaults', () => {
      expect(TabScrollContext).toBeDefined();
    });
  });
});
