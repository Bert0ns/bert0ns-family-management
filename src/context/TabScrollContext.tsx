import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from 'react';
import { Animated, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';

export const SCROLL_THRESHOLD = 24;

export function shouldShowTabLabels(
  scrollY: number,
  threshold: number = SCROLL_THRESHOLD,
): boolean {
  return scrollY <= threshold;
}

export type TabScrollEvent =
  NativeSyntheticEvent<NativeScrollEvent> | { nativeEvent: { contentOffset: { y: number } } };

export interface TabScrollContextValue {
  labelsVisibility: Animated.Value;
  isAtTop: boolean;
  handleTabScroll: (event: TabScrollEvent) => void;
  resetTabScroll: () => void;
}

const defaultLabelsVisibility = new Animated.Value(1);

const defaultContextValue: TabScrollContextValue = {
  labelsVisibility: defaultLabelsVisibility,
  isAtTop: true,
  handleTabScroll: () => {},
  resetTabScroll: () => {},
};

export const TabScrollContext = createContext<TabScrollContextValue>(defaultContextValue);

export function TabScrollProvider({ children }: { children: ReactNode }) {
  const [labelsVisibility] = useState(() => new Animated.Value(1));
  const [isAtTop, setIsAtTop] = useState(true);
  const isAtTopRef = useRef(true);

  const handleTabScroll = useCallback(
    (event: TabScrollEvent) => {
      const rawY = event?.nativeEvent?.contentOffset?.y ?? 0;
      // Clamp negative y (iOS bounce) as <= SCROLL_THRESHOLD
      const y = Math.max(0, rawY);
      const atTop = shouldShowTabLabels(y, SCROLL_THRESHOLD);

      if (atTop && !isAtTopRef.current) {
        isAtTopRef.current = true;
        setIsAtTop(true);
        Animated.timing(labelsVisibility, {
          toValue: 1,
          duration: 180,
          useNativeDriver: false,
        }).start();
      } else if (!atTop && isAtTopRef.current) {
        isAtTopRef.current = false;
        setIsAtTop(false);
        Animated.timing(labelsVisibility, {
          toValue: 0,
          duration: 180,
          useNativeDriver: false,
        }).start();
      }
    },
    [labelsVisibility],
  );

  const resetTabScroll = useCallback(() => {
    isAtTopRef.current = true;
    setIsAtTop(true);
    Animated.timing(labelsVisibility, {
      toValue: 1,
      duration: 180,
      useNativeDriver: false,
    }).start();
  }, [labelsVisibility]);

  const value = useMemo<TabScrollContextValue>(
    () => ({
      labelsVisibility,
      isAtTop,
      handleTabScroll,
      resetTabScroll,
    }),
    [labelsVisibility, isAtTop, handleTabScroll, resetTabScroll],
  );

  return <TabScrollContext.Provider value={value}>{children}</TabScrollContext.Provider>;
}

export function useTabScroll(): TabScrollContextValue {
  try {
    const context = useContext(TabScrollContext);
    return context ?? defaultContextValue;
  } catch {
    return defaultContextValue;
  }
}
