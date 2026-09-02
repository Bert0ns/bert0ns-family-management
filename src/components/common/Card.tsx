import React from 'react';
import { View, StyleSheet, ViewStyle, StyleProp } from 'react-native';
import { useTheme } from '@/theme';

interface CardProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  variant?: 'elevated' | 'outlined' | 'subtle';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  style,
  variant = 'elevated',
  padding = 'md',
}) => {
  const { theme, spacing, radius } = useTheme();

  const getPadding = () => {
    switch (padding) {
      case 'none':
        return 0;
      case 'sm':
        return spacing.sm;
      case 'lg':
        return spacing.lg;
      case 'md':
      default:
        return spacing.md;
    }
  };

  const cardStyle: ViewStyle = {
    backgroundColor: variant === 'subtle' ? theme.colors.surfaceSubtle : theme.colors.card,
    borderRadius: radius.lg,
    padding: getPadding(),
    borderWidth: 1,
    borderColor: variant === 'outlined' ? theme.colors.border : theme.colors.cardBorder,
    shadowColor: theme.colors.shadow,
    shadowOffset: { width: 0, height: variant === 'elevated' ? 4 : 0 },
    shadowOpacity: variant === 'elevated' ? 0.08 : 0,
    shadowRadius: variant === 'elevated' ? 12 : 0,
    elevation: variant === 'elevated' ? 3 : 0,
  };

  return <View style={[cardStyle, style]}>{children}</View>;
};
