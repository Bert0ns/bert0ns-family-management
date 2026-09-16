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
    md: spacing.md + 2,
    lg: spacing.lg + 4,
  };

  const isElevated = variant === 'elevated' || variant === 'glass';
  const isWeb = Platform.OS === 'web';

  const shadowStyles = isWeb
    ? isElevated
      ? ({
          backdropFilter: 'blur(24px)',
          WebkitBackdropFilter: 'blur(24px)',
          boxShadow: theme.isDark
            ? '0 10px 32px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.12)'
            : '0 8px 28px -2px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.9)',
        } as any)
      : ({
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: theme.isDark
            ? '0 4px 16px -2px rgba(0, 0, 0, 0.4)'
            : '0 2px 8px rgba(15, 23, 42, 0.04)',
        } as any)
    : {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: isElevated ? 6 : 2 },
        shadowOpacity: isElevated ? (theme.isDark ? 0.4 : 0.08) : 0.04,
        shadowRadius: isElevated ? 18 : 6,
        elevation: isElevated ? 5 : 2,
      };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return theme.colors.surfaceSubtle;
      case 'glass':
        return theme.colors.glass;
      case 'outlined':
        return theme.isDark ? 'rgba(19, 27, 46, 0.6)' : 'rgba(255, 255, 255, 0.7)';
      case 'elevated':
      default:
        return theme.colors.card;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: radius.xl,
    padding: paddingValues[padding] ?? spacing.md,
    borderWidth: 1.5,
    borderColor: variant === 'outlined' ? theme.colors.borderTactile : theme.colors.cardBorder,
    ...shadowStyles,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
