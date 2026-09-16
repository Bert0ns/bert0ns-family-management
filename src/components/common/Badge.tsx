import React from 'react';
import { View, Text, ViewStyle, TextStyle } from 'react-native';
import { useTheme } from '@/theme';

interface BadgeProps {
  label: string;
  color?: string;
  bgColor?: string;
  variant?: 'solid' | 'subtle' | 'outline';
  size?: 'sm' | 'md';
  icon?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  label,
  color,
  bgColor,
  variant = 'subtle',
  size = 'md',
  icon,
}) => {
  const { theme, spacing, radius, typography } = useTheme();

  const primaryColor = color || theme.colors.brand;
  const backgroundColor =
    bgColor ||
    (variant === 'solid'
      ? primaryColor
      : variant === 'subtle'
        ? `${primaryColor}22`
        : 'transparent');

  const textColor = variant === 'solid' ? '#FFFFFF' : primaryColor;

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderRadius: radius.full,
    paddingVertical: size === 'sm' ? 4 : spacing.xs + 2,
    paddingHorizontal: size === 'sm' ? spacing.sm + 2 : spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: variant === 'outline' ? primaryColor : `${primaryColor}33`,
    gap: spacing.xs,
    alignSelf: 'flex-start',
  };

  const textStyle: TextStyle = {
    color: textColor,
    fontSize: size === 'sm' ? typography.fontSizes.xs : typography.fontSizes.sm,
    fontWeight: typography.fontWeights.bold,
  };

  return (
    <View style={containerStyle}>
      {icon}
      <Text style={textStyle}>{label}</Text>
    </View>
  );
};
