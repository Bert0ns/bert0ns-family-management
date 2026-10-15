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

  const shadowStyles: ViewStyle = isWeb
    ? isElevated
      ? ({
          boxShadow: theme.isDark
            ? '0 2px 8px rgba(0, 0, 0, 0.35)'
            : '0 1px 4px rgba(27, 33, 30, 0.04)',
        } as unknown as ViewStyle)
      : ({
          boxShadow: theme.isDark
            ? '0 1px 3px rgba(0, 0, 0, 0.2)'
            : '0 1px 2px rgba(27, 33, 30, 0.02)',
        } as unknown as ViewStyle)
    : {
        shadowColor: theme.colors.shadow,
        shadowOffset: { width: 0, height: isElevated ? 3 : 1 },
        shadowOpacity: isElevated ? (theme.isDark ? 0.35 : 0.06) : 0.03,
        shadowRadius: isElevated ? 8 : 3,
        elevation: isElevated ? 3 : 1,
      };

  const getBackgroundColor = () => {
    switch (variant) {
      case 'subtle':
        return theme.colors.surfaceSubtle;
      case 'glass':
        return theme.colors.glass;
      case 'outlined':
        return theme.colors.surfaceSubtle;
      case 'elevated':
      default:
        return theme.colors.card;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: getBackgroundColor(),
    borderRadius: radius.sm,
    padding: paddingValues[padding] ?? spacing.md,
    borderWidth: 1,
    borderColor: variant === 'outlined' ? theme.colors.borderTactile : theme.colors.cardBorder,
    ...shadowStyles,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
