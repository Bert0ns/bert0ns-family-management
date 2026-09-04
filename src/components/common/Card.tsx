import React from 'react';
import { View, ViewStyle, StyleProp, Platform } from 'react-native';
import { useTheme } from '@/theme';

type CardVariant = 'elevated' | 'outlined' | 'subtle' | 'glass';
type CardPadding = 'none' | 'sm' | 'md' | 'lg';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: CardVariant;
  padding?: CardPadding;
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const { theme, spacing, radius } = useTheme();

  const paddingValues: Record<CardPadding, number> = {
    none: 0,
    sm: spacing.sm,
    md: spacing.md,
    lg: spacing.lg,
  };

  const isElevated = variant === 'elevated' || variant === 'glass';
  const isWeb = Platform.OS === 'web';

  const shadowStyles = isWeb
    ? isElevated
      ? ({
          backdropFilter: 'blur(20px)',
          WebkitBackdropFilter: 'blur(20px)',
          boxShadow: theme.isDark
            ? '0 8px 32px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
            : '0 8px 28px rgba(148, 163, 184, 0.12), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        } as any)
      : ({
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
        } as any)
    : {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: isElevated ? 6 : 0 },
        shadowOpacity: isElevated ? (theme.isDark ? 0.35 : 0.08) : 0,
        shadowRadius: isElevated ? 16 : 0,
        elevation: isElevated ? 4 : 0,
      };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return theme.colors.surfaceSubtle;
      case 'glass':
        return (theme.colors as any).glass || theme.colors.card;
      case 'elevated':
      case 'outlined':
      default:
        return theme.colors.card;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: radius.xl,
    padding: paddingValues[padding] ?? spacing.md,
    borderWidth: 1,
    borderColor: variant === 'outlined' ? theme.colors.border : theme.colors.cardBorder,
    ...shadowStyles,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
