import React from 'react';
import { View, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme';

type CardVariant = 'elevated' | 'outlined' | 'subtle';
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

  const isElevated = variant === 'elevated';

  const cardStyle: ViewStyle = {
    backgroundColor: variant === 'subtle' ? theme.colors.surfaceSubtle : theme.colors.card,
    borderRadius: radius.lg,
    padding: paddingValues[padding] ?? spacing.md,
    borderWidth: 1,
    borderColor: variant === 'outlined' ? theme.colors.border : theme.colors.cardBorder,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: isElevated ? 4 : 0 },
    shadowOpacity: isElevated ? 0.08 : 0,
    shadowRadius: isElevated ? 12 : 0,
    elevation: isElevated ? 3 : 0,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
