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
        ? theme.colors.brandLight
        : 'transparent');

  const textColor = variant === 'solid' ? '#FFFFFF' : primaryColor;

  const containerStyle: ViewStyle = {
    backgroundColor,
    borderRadius: radius.sm,
    paddingVertical: size === 'sm' ? 3 : spacing.xs,
    paddingHorizontal: size === 'sm' ? spacing.sm : spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor:
      variant === 'outline'
        ? primaryColor
        : variant === 'solid'
          ? primaryColor
          : color
            ? `${primaryColor}40`
            : theme.colors.borderTactile,
    gap: spacing.xs,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  };

  const textStyle: TextStyle = {
    color: textColor,
    fontSize: Math.max(
      typography.fontSizes.xs,
      size === 'sm' ? typography.fontSizes.xs : typography.fontSizes.sm,
    ),
    fontWeight: typography.fontWeights.bold,
    flexShrink: 1,
  };

  return (
    <View style={containerStyle}>
      {icon}
      <Text style={textStyle} numberOfLines={1} ellipsizeMode="tail">
        {label}
      </Text>
    </View>
  );
};
